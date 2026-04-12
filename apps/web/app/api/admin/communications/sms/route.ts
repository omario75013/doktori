import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, smsLogs } from "@doktori/db";
import { and, desc, gte, ilike, inArray, lte } from "drizzle-orm";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);

  const statusParam = searchParams.get("status");
  const statuses = statusParam
    ? statusParam.split(",").filter((s) =>
        ["pending", "sent", "delivered", "failed"].includes(s)
      )
    : [];

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const recipient = searchParams.get("recipient")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10));
  const offset = (page - 1) * limit;

  const conditions = [
    ...(statuses.length === 1
      ? [inArray(smsLogs.status, statuses)]
      : statuses.length > 1
      ? [inArray(smsLogs.status, statuses)]
      : []),
    ...(from ? [gte(smsLogs.createdAt, new Date(from))] : []),
    ...(to ? [lte(smsLogs.createdAt, new Date(to + "T23:59:59"))] : []),
    ...(recipient ? [ilike(smsLogs.recipient, `%${recipient}%`)] : []),
  ];

  const rows = await db
    .select({
      id: smsLogs.id,
      recipient: smsLogs.recipient,
      message: smsLogs.message,
      status: smsLogs.status,
      provider: smsLogs.provider,
      cost: smsLogs.cost,
      appointmentId: smsLogs.appointmentId,
      createdAt: smsLogs.createdAt,
    })
    .from(smsLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(smsLogs.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({
    logs: data.map((r) => ({
      ...r,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
    hasMore,
    page,
  });
}
