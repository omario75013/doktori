import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const todayISO = today.toISOString().slice(0, 10);

  const rows = await db.execute(sql`
    WITH sec AS (
      SELECT
        s.id,
        s.name,
        s.phone,
        s.is_active,
        s.last_active_at,
        COALESCE(s.hire_date, s.created_at::date) AS start_date,
        COALESCE(s.monthly_day_off_allowance, 0)::float AS allowance
      FROM secretaries s
      WHERE s.doctor_id = ${session.user.id}
        AND s.is_active = true
    ),
    used AS (
      SELECT t.secretary_id, SUM((t.end_date - t.start_date) + 1)::int AS used_days
      FROM secretary_time_off t
      WHERE t.status = 'approved'
      GROUP BY t.secretary_id
    )
    SELECT
      sec.id,
      sec.name,
      sec.phone,
      sec.is_active AS "isActive",
      sec.last_active_at AS "lastActiveAt",
      COALESCE(
        (SELECT json_agg(json_build_object(
          'startTime', sch.start_time,
          'endTime',   sch.end_time,
          'isActive',  sch.is_active
        ) ORDER BY sch.start_time)
         FROM secretary_schedules sch
         WHERE sch.secretary_id = sec.id AND sch.day_of_week = ${dayOfWeek} AND sch.is_active = true),
        '[]'::json
      ) AS "todaySlots",
      (SELECT json_build_object(
         'startDate', t.start_date,
         'endDate',   t.end_date,
         'reason',    t.reason,
         'status',    t.status
       )
       FROM secretary_time_off t
       WHERE t.secretary_id = sec.id
         AND t.status = 'approved'
         AND ${todayISO}::date BETWEEN t.start_date AND t.end_date
       LIMIT 1
      ) AS "offToday",
      sec.allowance AS "leaveAllowance",
      (
        (EXTRACT(YEAR FROM age(current_date, sec.start_date))::int * 12)
        + EXTRACT(MONTH FROM age(current_date, sec.start_date))::int
        + 1
      )::int AS "leaveMonths",
      ROUND(
        (sec.allowance * (
          (EXTRACT(YEAR FROM age(current_date, sec.start_date))::int * 12)
          + EXTRACT(MONTH FROM age(current_date, sec.start_date))::int
          + 1
        ))::numeric,
        1
      )::float AS "leaveAccrued",
      COALESCE(used.used_days, 0) AS "leaveUsed",
      ROUND(
        (
          sec.allowance * (
            (EXTRACT(YEAR FROM age(current_date, sec.start_date))::int * 12)
            + EXTRACT(MONTH FROM age(current_date, sec.start_date))::int
            + 1
          )
          - COALESCE(used.used_days, 0)
        )::numeric,
        1
      )::float AS "leaveBalance"
    FROM sec
    LEFT JOIN used ON used.secretary_id = sec.id
    ORDER BY sec.name
  `);

  return NextResponse.json(rows);
}
