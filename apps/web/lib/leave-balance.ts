import "server-only";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

/**
 * Compute a secretary's time-off balance.
 *
 * Formula:
 *   accrued = monthsSinceHire × monthlyAllowance
 *   used    = sum of approved time-off days (inclusive of start and end)
 *   balance = accrued − used   (can be negative)
 *
 * Months are counted inclusively: hire on 12 Mar + today 8 Apr → 2 months.
 * If hire_date is null we fall back to secretaries.created_at.
 */
export async function computeLeaveBalance(secretaryId: string): Promise<{
  accrued: number;
  used: number;
  balance: number;
  allowance: number | null;
  monthsSinceStart: number;
  startDate: string | null;
} | null> {
  const rows = (await db.execute(sql`
    WITH sec AS (
      SELECT
        s.id,
        COALESCE(s.hire_date, s.created_at::date) AS start_date,
        COALESCE(s.monthly_day_off_allowance, 0)::float AS allowance
      FROM secretaries s
      WHERE s.id = ${secretaryId}
    ),
    used AS (
      SELECT COALESCE(SUM(
        (t.end_date - t.start_date) + 1
      ), 0)::int AS used_days
      FROM secretary_time_off t
      WHERE t.secretary_id = ${secretaryId}
        AND t.status = 'approved'
    )
    SELECT
      sec.start_date AS "startDate",
      sec.allowance  AS "allowance",
      used.used_days AS "usedDays",
      GREATEST(
        0,
        (
          (EXTRACT(YEAR FROM age(current_date, sec.start_date))::int * 12)
          + EXTRACT(MONTH FROM age(current_date, sec.start_date))::int
          + 1
        )
      )::int AS "monthsSinceStart"
    FROM sec CROSS JOIN used
  `)) as unknown as Array<{
    startDate: string | null;
    allowance: number;
    usedDays: number;
    monthsSinceStart: number;
  }>;

  if (rows.length === 0) return null;
  const r = rows[0];
  const allowance = Number(r.allowance ?? 0);
  const months = Number(r.monthsSinceStart ?? 0);
  const used = Number(r.usedDays ?? 0);
  const accrued = Math.round(allowance * months * 10) / 10;
  const balance = Math.round((accrued - used) * 10) / 10;
  return {
    accrued,
    used,
    balance,
    allowance: allowance || null,
    monthsSinceStart: months,
    startDate: r.startDate,
  };
}
