import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { sql, eq } from "drizzle-orm";
import { BarChart3 } from "lucide-react";
import { StatsClient } from "./stats-client";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

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
    ORDER BY month ASC
  `);

  // Peak hours histogram (0-23)
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

  // Top 5 reasons
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
    WHERE EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = first_visits.patient_id
        AND a.doctor_id = ${doctorId}
        AND a.starts_at > NOW() - INTERVAL '30 days'
    )
  `);

  // Revenue projection
  const [doctor] = await db
    .select({ consultationFee: doctors.consultationFee })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  const feeMillimes = doctor?.consultationFee ?? 0;
  const feeInDT = feeMillimes / 1000;

  const confirmedRows = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND status IN ('confirmed', 'completed')
      AND starts_at >= DATE_TRUNC('month', NOW())
      AND starts_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  `);

  const confirmedCount =
    ((confirmedRows as unknown as Array<{ count: number }>)[0]?.count) ?? 0;
  const revenueProjection = confirmedCount * feeInDT;

  // Derived KPIs
  type MonthlyRow = {
    month: string;
    total: number;
    completed: number;
    cancelled: number;
    no_shows: number;
  };
  const monthly = monthlyRows as unknown as MonthlyRow[];

  const currentMonthRow = monthly[monthly.length - 1];
  const totalThisMonth = currentMonthRow?.total ?? 0;
  const noShowsThisMonth = currentMonthRow?.no_shows ?? 0;

  const confirmationRate =
    totalThisMonth > 0
      ? Math.round(((currentMonthRow?.completed ?? 0) / totalThisMonth) * 100)
      : 0;
  const noShowRate =
    totalThisMonth > 0 ? Math.round((noShowsThisMonth / totalThisMonth) * 100) : 0;

  type PeakRow = { hour: number; count: number };
  const peaks = peakRows as unknown as PeakRow[];

  type ReasonRow = { reason: string; count: number };
  const reasons = reasonRows as unknown as ReasonRow[];

  const patientStats = (
    (
      patientStatsRows as unknown as Array<{
        new_patients: number;
        returning_patients: number;
      }>
    )[0]
  ) ?? { new_patients: 0, returning_patients: 0 };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
          <p className="text-sm text-gray-500">Analyse des 6 derniers mois</p>
        </div>
      </div>

      {/* All interactive content delegated to client component */}
      <StatsClient
        monthly={monthly}
        peaks={peaks}
        reasons={reasons}
        totalThisMonth={totalThisMonth}
        confirmationRate={confirmationRate}
        noShowRate={noShowRate}
        revenueProjection={revenueProjection}
        feeInDT={feeInDT}
        confirmedCount={confirmedCount}
        newPatients={patientStats.new_patients}
        returningPatients={patientStats.returning_patients}
      />
    </div>
  );
}
