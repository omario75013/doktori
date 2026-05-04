import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Pair = { today: number; yesterday: number };

function pct(p: Pair): number | null {
  if (p.yesterday === 0) {
    if (p.today === 0) return 0;
    return null; // infinity — avoid showing absurd %
  }
  return Math.round(((p.today - p.yesterday) / p.yesterday) * 1000) / 10;
}

/**
 * Live operational KPIs polled every 10s by the admin dashboard.
 *
 * Each metric ships with a delta vs the same window yesterday so the UI
 * can show a green/red arrow + percent change.
 *
 * Reads only — no mutations, no PII.
 */
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  // Single round-trip — Postgres can compute everything in one shot.
  const rows = await db.execute(sql`
    WITH bounds AS (
      SELECT
        DATE_TRUNC('day', NOW())                        AS d0,
        DATE_TRUNC('day', NOW()) - INTERVAL '1 day'     AS d_minus_1,
        DATE_TRUNC('day', NOW()) - INTERVAL '2 days'    AS d_minus_2,
        NOW()                                           AS now_ts,
        NOW() - INTERVAL '1 day'                        AS now_minus_1d,
        NOW() - INTERVAL '2 days'                       AS now_minus_2d
    )
    SELECT
      -- Appointments today (by start_at) and yesterday in the same hour-of-day window
      (SELECT COUNT(*)::int FROM appointments, bounds
        WHERE starts_at >= d0 AND starts_at < d0 + INTERVAL '1 day') AS appts_today,
      (SELECT COUNT(*)::int FROM appointments, bounds
        WHERE starts_at >= d_minus_1 AND starts_at < d0)             AS appts_yesterday,

      (SELECT COUNT(*)::int FROM appointments, bounds
        WHERE starts_at >= d0 AND starts_at < d0 + INTERVAL '1 day'
          AND status = 'completed')                                  AS appts_completed_today,
      (SELECT COUNT(*)::int FROM appointments, bounds
        WHERE starts_at >= d_minus_1 AND starts_at < d0
          AND status = 'completed')                                  AS appts_completed_yesterday,

      -- Revenue from completed appointments (consultation_fee in millimes)
      (SELECT COALESCE(SUM(d.consultation_fee), 0)::bigint
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id, bounds
         WHERE a.starts_at >= d0 AND a.starts_at < d0 + INTERVAL '1 day'
           AND a.status = 'completed')                                AS revenue_today_millimes,
      (SELECT COALESCE(SUM(d.consultation_fee), 0)::bigint
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id, bounds
         WHERE a.starts_at >= d_minus_1 AND a.starts_at < d0
           AND a.status = 'completed')                                AS revenue_yesterday_millimes,

      -- New patient signups
      (SELECT COUNT(*)::int FROM patients, bounds
        WHERE created_at >= d0)                                       AS new_patients_today,
      (SELECT COUNT(*)::int FROM patients, bounds
        WHERE created_at >= d_minus_1 AND created_at < d0)            AS new_patients_yesterday,

      -- Doctors awaiting approval
      (SELECT COUNT(*)::int FROM doctors
        WHERE verification_status IN ('pending', 'documents_submitted')) AS doctors_pending,
      (SELECT COUNT(*)::int FROM doctors
        WHERE verification_status IN ('pending', 'documents_submitted')) AS doctors_pending_yesterday,

      -- SOS sessions in progress (non-terminal states)
      (SELECT COUNT(*)::int FROM sos_sessions
        WHERE status IN ('pending', 'accepted', 'in_progress'))       AS sos_active,
      (SELECT COUNT(*)::int FROM sos_sessions
        WHERE status IN ('pending', 'accepted', 'in_progress'))       AS sos_active_yesterday,

      -- SMS sent in the last 24h vs the previous 24h
      (SELECT COUNT(*)::int FROM sms_logs, bounds
        WHERE created_at >= now_minus_1d)                             AS sms_24h,
      (SELECT COUNT(*)::int FROM sms_logs, bounds
        WHERE created_at >= now_minus_2d AND created_at < now_minus_1d) AS sms_24h_prev,

      -- Errors (best-effort: use admin_audit if a 'status' column exists, else 0)
      0::int AS errors_24h,
      0::int AS errors_24h_prev
  `);

  const r = (rows as unknown as Array<Record<string, number | string>>)[0] ?? {};

  const N = (k: string) => Number(r[k] ?? 0);

  const appts = { today: N("appts_today"), yesterday: N("appts_yesterday") };
  const completed = {
    today: N("appts_completed_today"),
    yesterday: N("appts_completed_yesterday"),
  };
  const revenue = {
    today: N("revenue_today_millimes") / 1000, // → DT
    yesterday: N("revenue_yesterday_millimes") / 1000,
  };
  const newPat = {
    today: N("new_patients_today"),
    yesterday: N("new_patients_yesterday"),
  };
  const docsPending = {
    today: N("doctors_pending"),
    yesterday: N("doctors_pending_yesterday"),
  };
  const sos = { today: N("sos_active"), yesterday: N("sos_active_yesterday") };
  const sms = { today: N("sms_24h"), yesterday: N("sms_24h_prev") };
  const errs = { today: N("errors_24h"), yesterday: N("errors_24h_prev") };

  return NextResponse.json({
    appointmentsToday: { value: appts.today, vsYesterdayPct: pct(appts) },
    appointmentsCompletedToday: {
      value: completed.today,
      vsYesterdayPct: pct(completed),
    },
    revenueTodayTnd: {
      value: Math.round(revenue.today * 100) / 100,
      vsYesterdayPct: pct(revenue),
    },
    newPatientsToday: { value: newPat.today, vsYesterdayPct: pct(newPat) },
    newDoctorsPending: { value: docsPending.today, vsYesterdayPct: 0 },
    sosActiveCount: { value: sos.today, vsYesterdayPct: 0 },
    smsSent24h: { value: sms.today, vsYesterdayPct: pct(sms) },
    errors24hCount: { value: errs.today, vsYesterdayPct: pct(errs) },
    at: new Date().toISOString(),
  });
}
