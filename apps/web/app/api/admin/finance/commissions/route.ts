import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/commissions
 *
 * Aggregates SOS commissions from `sos_sessions.commission`.
 * The column exists (see schema.ts:841) and is populated when a session reaches
 * 'completed'. Returns:
 *   - total_this_month: sum of commission for sessions completed this month
 *   - sessions: list of completed sessions with commission breakdown
 *   - by_doctor: per-doctor rollup
 *
 * Filters: ?from=YYYY-MM-DD&to=YYYY-MM-DD&doctorId=<uuid>
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const doctorId = searchParams.get("doctorId");

  // YYYY-MM-DD validation. If invalid, ignore the filter rather than 400.
  const from = fromRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : null;
  const to = toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : null;
  const dId = doctorId && /^[0-9a-f-]{36}$/i.test(doctorId) ? doctorId : null;

  const whereClauses = [
    sql`s.status = 'completed'`,
    sql`s.commission IS NOT NULL`,
  ];
  if (from) whereClauses.push(sql`s.completed_at >= ${from}::date`);
  if (to) whereClauses.push(sql`s.completed_at < (${to}::date + interval '1 day')`);
  if (dId) whereClauses.push(sql`s.doctor_id = ${dId}::uuid`);

  // join with `sql.join` separator
  const whereSql = whereClauses.reduce<ReturnType<typeof sql>>(
    (acc, clause, i) => (i === 0 ? clause : sql`${acc} AND ${clause}`),
    sql``
  );

  const [totalRow] = await db.execute<{ total: number; count: number }>(sql`
    SELECT
      COALESCE(SUM(s.commission), 0)::bigint AS total,
      COUNT(*)::int AS count
    FROM sos_sessions s
    WHERE ${whereSql}
  `);

  const [thisMonthRow] = await db.execute<{ total: number }>(sql`
    SELECT COALESCE(SUM(commission), 0)::bigint AS total
    FROM sos_sessions
    WHERE status = 'completed'
      AND commission IS NOT NULL
      AND completed_at >= date_trunc('month', NOW())
  `);

  const sessions = await db.execute(sql`
    SELECT
      s.id,
      s.commission,
      s.fee,
      s.completed_at,
      s.symptom_category,
      s.distance_m,
      d.id   AS doctor_id,
      d.name AS doctor_name,
      d.specialty AS doctor_specialty,
      p.id   AS patient_id,
      p.name AS patient_name
    FROM sos_sessions s
    LEFT JOIN doctors d ON d.id = s.doctor_id
    LEFT JOIN patients p ON p.id = s.patient_id
    WHERE ${whereSql}
    ORDER BY s.completed_at DESC NULLS LAST
    LIMIT 200
  `);

  const byDoctor = await db.execute(sql`
    SELECT
      d.id        AS doctor_id,
      d.name      AS doctor_name,
      d.specialty AS doctor_specialty,
      COUNT(*)::int                              AS session_count,
      COALESCE(SUM(s.commission), 0)::bigint     AS total_commission,
      COALESCE(SUM(s.fee), 0)::bigint            AS total_fees
    FROM sos_sessions s
    LEFT JOIN doctors d ON d.id = s.doctor_id
    WHERE ${whereSql}
    GROUP BY d.id, d.name, d.specialty
    ORDER BY total_commission DESC
    LIMIT 50
  `);

  return NextResponse.json({
    total_filtered: Number((totalRow as Record<string, unknown>).total ?? 0),
    count_filtered: Number((totalRow as Record<string, unknown>).count ?? 0),
    total_this_month: Number((thisMonthRow as Record<string, unknown>).total ?? 0),
    sessions,
    by_doctor: byDoctor,
  });
}
