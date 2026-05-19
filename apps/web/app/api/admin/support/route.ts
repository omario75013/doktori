import { NextResponse, type NextRequest } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, supportTickets } from "@doktori/db";
import { requireAdmin } from "@/lib/admin-auth";

const MAX_PAGE_SIZE = 200;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const pageSize = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50, 1),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
  const offset = (page - 1) * pageSize;

  const baseQuery = db.select().from(supportTickets);
  const rows = await (status
    ? baseQuery.where(eq(supportTickets.status, status))
    : baseQuery
  )
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(status ? eq(supportTickets.status, status) : sql`true`);

  return NextResponse.json({ tickets: rows, total: Number(count ?? 0), page, pageSize });
}
