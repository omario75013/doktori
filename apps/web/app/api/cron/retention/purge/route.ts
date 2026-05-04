import { NextResponse } from "next/server";
import { db, retentionPolicies } from "@doktori/db";
import { eq, sql } from "drizzle-orm";

/**
 * Retention purge cron. Bearer CRON_SECRET required.
 *
 * Behavior:
 *  - Iterates over all rows in retention_policies
 *  - For each known table, applies the policy:
 *      - hard_delete = true  → DELETE rows older than cutoff
 *      - hard_delete = false → anonymize sensitive columns
 *  - DRY-RUN BY DEFAULT. Pass ?execute=true to actually apply changes.
 *
 * Returns a per-policy summary with affected (counted in dry-run mode too).
 */

type Handler = {
  // SQL to count rows that would be affected
  countSql: (cutoffIsoDays: number) => ReturnType<typeof sql>;
  // SQL to apply the action
  applySql: (cutoffIsoDays: number, hardDelete: boolean) => ReturnType<typeof sql> | null;
};

const HANDLERS: Record<string, Handler> = {
  audit_logs: {
    countSql: (days) =>
      sql`SELECT COUNT(*)::int AS n FROM admin_audit_logs WHERE created_at < (now() - (${days} || ' days')::interval)`,
    applySql: (days, hardDelete) =>
      hardDelete
        ? sql`DELETE FROM admin_audit_logs WHERE created_at < (now() - (${days} || ' days')::interval)`
        : sql`UPDATE admin_audit_logs SET before = NULL, after = NULL, ip = NULL, user_agent = NULL WHERE created_at < (now() - (${days} || ' days')::interval) AND (before IS NOT NULL OR after IS NOT NULL OR ip IS NOT NULL)`,
  },
  sms_logs: {
    countSql: (days) =>
      sql`SELECT COUNT(*)::int AS n FROM sms_logs WHERE created_at < (now() - (${days} || ' days')::interval)`,
    applySql: (days, hardDelete) =>
      hardDelete
        ? sql`DELETE FROM sms_logs WHERE created_at < (now() - (${days} || ' days')::interval)`
        : sql`UPDATE sms_logs SET message = '[anonymized]', recipient = '[redacted]' WHERE created_at < (now() - (${days} || ' days')::interval) AND message <> '[anonymized]'`,
  },
  messages: {
    countSql: (days) =>
      sql`SELECT COUNT(*)::int AS n FROM messages WHERE created_at < (now() - (${days} || ' days')::interval)`,
    applySql: (days, hardDelete) =>
      hardDelete
        ? sql`DELETE FROM messages WHERE created_at < (now() - (${days} || ' days')::interval)`
        : sql`UPDATE messages SET body = '[anonymized]' WHERE created_at < (now() - (${days} || ' days')::interval) AND body <> '[anonymized]'`,
  },
  cancelled_appointments: {
    countSql: (days) =>
      sql`SELECT COUNT(*)::int AS n FROM appointments WHERE status = 'cancelled' AND updated_at < (now() - (${days} || ' days')::interval)`,
    applySql: (days, hardDelete) =>
      hardDelete
        ? sql`DELETE FROM appointments WHERE status = 'cancelled' AND updated_at < (now() - (${days} || ' days')::interval)`
        : null, // no anonymize variant — too risky
  },
  webhook_logs: {
    countSql: (days) =>
      // Best-effort: webhook_logs may not exist; return 0 by guarding the count
      sql`SELECT COALESCE((SELECT COUNT(*)::int FROM information_schema.tables WHERE table_name = 'webhook_logs'), 0) AS n`,
    applySql: () => null,
  },
  analytics_events: {
    countSql: (days) =>
      sql`SELECT COALESCE((SELECT COUNT(*)::int FROM information_schema.tables WHERE table_name = 'analytics_events'), 0) AS n`,
    applySql: () => null,
  },
  inactive_patients: {
    // Patients with no recent activity. Detection via last_active_at if present.
    countSql: (days) =>
      sql`SELECT COUNT(*)::int AS n FROM patients WHERE COALESCE(last_active_at, created_at) < (now() - (${days} || ' days')::interval)`,
    applySql: () => null, // too risky to auto-purge patients — manual approval needed
  },
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(req.url);
  const execute = url.searchParams.get("execute") === "true";
  const now = new Date();

  const policies = await db.select().from(retentionPolicies);
  const summary: Array<{
    policy: string;
    retentionDays: number;
    hardDelete: boolean;
    affected: number;
    applied: boolean;
    note?: string;
  }> = [];

  for (const p of policies) {
    const handler = HANDLERS[p.resourceType];
    if (!handler) {
      summary.push({
        policy: p.resourceType,
        retentionDays: p.retentionDays,
        hardDelete: p.hardDelete,
        affected: 0,
        applied: false,
        note: "no handler",
      });
      continue;
    }

    let affected = 0;
    try {
      const countRes = await db.execute(handler.countSql(p.retentionDays));
      // drizzle pg execute returns a result with rows
      const rows = (countRes as unknown as { rows?: Array<{ n: number }> }).rows
        ?? (countRes as unknown as Array<{ n: number }>);
      affected = Number(rows?.[0]?.n ?? 0);
    } catch (e) {
      summary.push({
        policy: p.resourceType,
        retentionDays: p.retentionDays,
        hardDelete: p.hardDelete,
        affected: 0,
        applied: false,
        note: `count failed: ${(e as Error).message}`,
      });
      continue;
    }

    let applied = false;
    if (execute && affected > 0) {
      const stmt = handler.applySql(p.retentionDays, p.hardDelete);
      if (stmt) {
        try {
          await db.execute(stmt);
          applied = true;
        } catch (e) {
          summary.push({
            policy: p.resourceType,
            retentionDays: p.retentionDays,
            hardDelete: p.hardDelete,
            affected,
            applied: false,
            note: `apply failed: ${(e as Error).message}`,
          });
          continue;
        }
      }
    }

    if (execute) {
      await db
        .update(retentionPolicies)
        .set({ lastRunAt: now })
        .where(eq(retentionPolicies.resourceType, p.resourceType));
    }

    summary.push({
      policy: p.resourceType,
      retentionDays: p.retentionDays,
      hardDelete: p.hardDelete,
      affected,
      applied,
    });
  }

  return NextResponse.json({
    dryRun: !execute,
    at: now.toISOString(),
    summary,
  });
}

export const GET = POST;
