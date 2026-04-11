import { db, adminAuditLogs } from "@doktori/db";
import type { AdminSession } from "@/lib/admin-auth";

export type AuditParams = {
  actor: AdminSession;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Persist an audit log row. Fire-and-forget — errors are logged but never
 * thrown, so an audit failure cannot block a successful mutation.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(adminAuditLogs).values({
      actorId: params.actor.id,
      actorEmail: params.actor.email,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      before: (params.before ?? null) as unknown as Record<string, unknown> | null,
      after: (params.after ?? null) as unknown as Record<string, unknown> | null,
      reason: params.reason ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch (e) {
    console.error("[audit] failed to persist audit log:", e);
  }
}

/**
 * Extract request metadata (IP, UA) from a standard Request.
 */
export function extractRequestMeta(req: Request): { ip: string; userAgent: string } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}
