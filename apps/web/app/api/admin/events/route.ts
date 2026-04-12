import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, adminAuditLogs } from "@doktori/db";
import { desc, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const where = sinceParam
    ? gt(adminAuditLogs.createdAt, new Date(sinceParam))
    : undefined;

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      actorEmail: adminAuditLogs.actorEmail,
      action: adminAuditLogs.action,
      resourceType: adminAuditLogs.resourceType,
      resourceId: adminAuditLogs.resourceId,
      before: adminAuditLogs.before,
      after: adminAuditLogs.after,
      reason: adminAuditLogs.reason,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .where(where)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit);

  return NextResponse.json({ events: rows });
}
