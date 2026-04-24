import { NextResponse, NextRequest } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  const rows = (await db.execute(sql`
    SELECT count(*)::int AS unread
    FROM staff_messages m
    INNER JOIN staff_conversations c ON c.id = m.conversation_id
    WHERE c.doctor_id = ${ctx.doctorId}
      AND m.read_at IS NULL
      AND NOT (m.sender_type = ${ctx.selfType} AND m.sender_id = ${ctx.selfId})
      AND (
        (c.member_a_type = ${ctx.selfType} AND c.member_a_id = ${ctx.selfId})
        OR (c.member_b_type = ${ctx.selfType} AND c.member_b_id = ${ctx.selfId})
      )
  `)) as unknown as Array<{ unread: number }>;

  return NextResponse.json({ count: Number(rows[0]?.unread ?? 0) });
}
