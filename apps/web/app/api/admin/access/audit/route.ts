import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, adminAuditLogs } from "@doktori/db";
import { desc, ilike, eq, and, gte, lte, or } from "drizzle-orm";

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "50")));
  const offset = (page - 1) * limit;

  const actor = searchParams.get("actor")?.trim() ?? "";
  const action = searchParams.get("action")?.trim() ?? "";
  const resourceType = searchParams.get("resourceType")?.trim() ?? "";
  const q = searchParams.get("q")?.trim() ?? ""; // resourceId search
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";

  const conditions = [];

  if (actor) {
    conditions.push(ilike(adminAuditLogs.actorEmail, `%${actor}%`));
  }
  if (action) {
    conditions.push(ilike(adminAuditLogs.action, `%${action}%`));
  }
  if (resourceType) {
    conditions.push(eq(adminAuditLogs.resourceType, resourceType));
  }
  if (q) {
    conditions.push(
      or(
        ilike(adminAuditLogs.resourceId, `%${q}%`),
        ilike(adminAuditLogs.actorEmail, `%${q}%`)
      )
    );
  }
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(adminAuditLogs.createdAt, fromDate));
    }
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      // Include the full day
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(adminAuditLogs.createdAt, toDate));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select()
    .from(adminAuditLogs)
    .where(where)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ logs, page, limit });
}
