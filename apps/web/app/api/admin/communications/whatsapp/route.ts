import { NextRequest, NextResponse } from "next/server";
import { db, whatsappLogs } from "@doktori/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(["super_admin", "support", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const recipientType = searchParams.get("recipientType");
  const since = searchParams.get("since"); // ISO date
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  const conditions = [];
  if (status) conditions.push(eq(whatsappLogs.status, status));
  if (recipientType) conditions.push(eq(whatsappLogs.recipientType, recipientType));
  if (since) conditions.push(gte(whatsappLogs.createdAt, new Date(since)));

  const rows = await db
    .select()
    .from(whatsappLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(whatsappLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(whatsappLogs)
    .where(conditions.length ? and(...conditions) : undefined);

  return NextResponse.json({ logs: rows, total: count, limit, offset });
}
