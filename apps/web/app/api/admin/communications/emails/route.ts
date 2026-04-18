import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/communications/emails
 * Returns paginated email logs from sms_logs where provider = 'email'.
 *
 * Query params:
 *   - page: number (default 1)
 *   - status: 'sent' | 'failed' | 'dev_logged'
 *   - from: ISO date string
 *   - to: ISO date string
 *   - search: recipient search substring
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "support", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const offset = (page - 1) * 50;
  const status = searchParams.get("status") ?? null;
  const from = searchParams.get("from") ?? null;
  const to = searchParams.get("to") ?? null;
  const search = searchParams.get("search") ?? null;

  const rows = await db.execute(sql`
    SELECT
      id,
      recipient,
      message AS subject,
      status,
      provider,
      created_at
    FROM sms_logs
    WHERE provider = 'email'
      ${status ? sql`AND status = ${status}` : sql``}
      ${from ? sql`AND created_at >= ${from}::timestamptz` : sql``}
      ${to ? sql`AND created_at <= ${to}::timestamptz + interval '1 day'` : sql``}
      ${search ? sql`AND recipient ILIKE ${"%" + search + "%"}` : sql``}
    ORDER BY created_at DESC
    LIMIT 50 OFFSET ${offset}
  `);

  const [{ total }] = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM sms_logs
    WHERE provider = 'email'
      ${status ? sql`AND status = ${status}` : sql``}
      ${from ? sql`AND created_at >= ${from}::timestamptz` : sql``}
      ${to ? sql`AND created_at <= ${to}::timestamptz + interval '1 day'` : sql``}
      ${search ? sql`AND recipient ILIKE ${"%" + search + "%"}` : sql``}
  `) as unknown as [{ total: number }];

  return NextResponse.json({
    emails: rows,
    total: Number(total),
    page,
    pageSize: 50,
  });
}
