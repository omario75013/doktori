import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctors } from "@doktori/db";
import { sql, eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = session.user.id;

  // Monthly appointments — last 6 months
  const monthlyRows = await db.execute(sql`
    SELECT
      DATE_TRUNC('month', starts_at) AS month,
      COUNT(*)::int                  AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int  AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int  AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::int    AS no_shows
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND starts_at > NOW() - INTERVAL '6 months'
    GROUP BY month
    ORDER BY month DESC
  `);

  // Peak hours — booking histogram (0-23)
  const peakRows = await db.execute(sql`
    SELECT
      EXTRACT(HOUR FROM starts_at)::int AS hour,
      COUNT(*)::int                     AS count
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND starts_at > NOW() - INTERVAL '6 months'
    GROUP BY hour
    ORDER BY hour
  `);

  // Top 5 appointment reasons (non-empty)
  const reasonRows = await db.execute(sql`
    SELECT
      TRIM(reason) AS reason,
      COUNT(*)::int AS count
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND reason IS NOT NULL
      AND TRIM(reason) <> ''
      AND starts_at > NOW() - INTERVAL '6 months'
    GROUP BY TRIM(reason)
    ORDER BY count DESC
    LIMIT 5
  `);

  // New vs returning patients — last 30 days
  // "New" = patient whose first appointment with this doctor is within the last 30 days
  const patientStatsRows = await db.execute(sql`
    WITH first_visits AS (
      SELECT
        patient_id,
        MIN(starts_at) AS first_at
      FROM appointments
      WHERE doctor_id = ${doctorId}
      GROUP BY patient_id
    )
    SELECT
      COUNT(*) FILTER (WHERE first_at > NOW() - INTERVAL '30 days')::int  AS new_patients,
      COUNT(*) FILTER (WHERE first_at <= NOW() - INTERVAL '30 days')::int AS returning_patients
    FROM first_visits
    JOIN appointments a ON a.patient_id = first_visits.patient_id
      AND a.doctor_id = ${doctorId}
      AND a.starts_at > NOW() - INTERVAL '30 days'
  `);

  // Revenue projection — confirmed appointments this calendar month × fee
  const [doctor] = await db
    .select({ consultationFee: doctors.consultationFee })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  const feeMillimes = doctor?.consultationFee ?? 0;

  const confirmedThisMonthRows = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND status IN ('confirmed', 'completed')
      AND starts_at >= DATE_TRUNC('month', NOW())
      AND starts_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  `);

  const confirmedCount = (confirmedThisMonthRows.rows[0] as { count: number }).count ?? 0;
  // consultationFee is stored in millimes — convert to DT for display
  const feeInDT = feeMillimes / 1000;
  const revenueProjection = confirmedCount * feeInDT;

  return NextResponse.json({
    monthlyAppointments: monthlyRows.rows as Array<{
      month: string;
      total: number;
      completed: number;
      cancelled: number;
      no_shows: number;
    }>,
    peakHours: peakRows.rows as Array<{ hour: number; count: number }>,
    topReasons: reasonRows.rows as Array<{ reason: string; count: number }>,
    patientStats: (patientStatsRows.rows[0] ?? {
      new_patients: 0,
      returning_patients: 0,
    }) as { new_patients: number; returning_patients: number },
    revenueProjection: {
      confirmedCount,
      feeInDT,
      totalDT: revenueProjection,
    },
  });
}
