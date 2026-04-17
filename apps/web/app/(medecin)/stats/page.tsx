import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { sql, eq } from "drizzle-orm";
import { BarChart3 } from "lucide-react";

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

  const confirmedCount = ((confirmedRows as unknown as Array<{ count: number }>)[0]?.count) ?? 0;
  const revenueProjection = confirmedCount * feeInDT;

  // Derived KPIs
  type MonthlyRow = { month: string; total: number; completed: number; cancelled: number; no_shows: number };
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
  const maxPeakCount = peaks.reduce((m, r) => Math.max(m, r.count), 1);

  type ReasonRow = { reason: string; count: number };
  const reasons = reasonRows as unknown as ReasonRow[];
  const maxReasonCount = reasons.reduce((m, r) => Math.max(m, r.count), 1);

  const patientStats = ((patientStatsRows as unknown as Array<{ new_patients: number; returning_patients: number }>)[0]) ?? {
    new_patients: 0,
    returning_patients: 0,
  };

  const maxMonthlyCount = monthly.reduce((m, r) => Math.max(m, r.total), 1);

  const monthLabels: Record<number, string> = {
    0: "Jan", 1: "Fév", 2: "Mar", 3: "Avr",
    4: "Mai", 5: "Juin", 6: "Juil", 7: "Août",
    8: "Sep", 9: "Oct", 10: "Nov", 11: "Déc",
  };

  function formatMonth(isoDate: string) {
    const d = new Date(isoDate);
    return `${monthLabels[d.getMonth()]} ${d.getFullYear()}`;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Statistiques</h1>
          <p className="text-sm text-gray-500">Analyse des 6 derniers mois</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Patients ce mois"
          value={String(totalThisMonth)}
          sub="rendez-vous"
          color="teal"
        />
        <KpiCard
          label="Taux de confirmation"
          value={`${confirmationRate}%`}
          sub="des RDV complétés"
          color="green"
        />
        <KpiCard
          label="Taux no-show"
          value={`${noShowRate}%`}
          sub="absences ce mois"
          color={noShowRate > 20 ? "red" : "orange"}
        />
        <KpiCard
          label="Revenus estimés"
          value={feeInDT > 0 ? `${revenueProjection.toFixed(0)} DT` : "—"}
          sub={feeInDT > 0 ? `${confirmedCount} RDV × ${feeInDT} DT` : "Honoraires non renseignés"}
          color="purple"
        />
      </div>

      {/* Monthly Bar Chart */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#134E4A] mb-4">Rendez-vous mensuels</h2>
        {monthly.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucune donnée disponible</p>
        ) : (
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {monthly.map((row) => {
              const barHeight = Math.max(
                4,
                Math.round((row.total / maxMonthlyCount) * 140),
              );
              return (
                <div key={row.month} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-xs text-gray-500">{row.total}</span>
                  <div
                    className="w-full rounded-t bg-[#0891B2]"
                    style={{ height: barHeight }}
                    title={`${row.completed} complétés, ${row.cancelled} annulés, ${row.no_shows} absences`}
                  />
                  <span className="text-xs text-gray-400 text-center leading-tight">
                    {formatMonth(row.month)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New vs Returning + Peak Hours */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Patient stats */}
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#134E4A] mb-4">Patients (30 derniers jours)</h2>
          <div className="space-y-4">
            <PatientBar
              label="Nouveaux patients"
              count={patientStats.new_patients}
              total={patientStats.new_patients + patientStats.returning_patients}
              color="bg-[#0891B2]"
            />
            <PatientBar
              label="Patients récurrents"
              count={patientStats.returning_patients}
              total={patientStats.new_patients + patientStats.returning_patients}
              color="bg-[#134E4A]"
            />
          </div>
          <div className="mt-4 flex gap-4 text-sm text-gray-500">
            <span>
              <span className="font-semibold text-[#134E4A]">{patientStats.new_patients}</span>{" "}
              nouveaux
            </span>
            <span>
              <span className="font-semibold text-[#134E4A]">{patientStats.returning_patients}</span>{" "}
              récurrents
            </span>
          </div>
        </div>

        {/* Top Reasons */}
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#134E4A] mb-4">Motifs les plus fréquents</h2>
          {reasons.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Aucun motif enregistré</p>
          ) : (
            <div className="space-y-3">
              {reasons.map((r, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#134E4A] truncate max-w-[200px]" title={r.reason}>
                      {r.reason}
                    </span>
                    <span className="text-gray-500 shrink-0 ml-2">{r.count}</span>
                  </div>
                  <div className="h-2 bg-[#F0FDFA] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0891B2] rounded-full"
                      style={{
                        width: `${Math.round((r.count / maxReasonCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#134E4A] mb-4">Créneaux les plus demandés</h2>
        {peaks.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Aucune donnée disponible</p>
        ) : (
          <>
            <div className="flex items-end gap-1" style={{ height: 80 }}>
              {Array.from({ length: 24 }, (_, h) => {
                const found = peaks.find((p) => p.hour === h);
                const count = found?.count ?? 0;
                const barH = count > 0 ? Math.max(4, Math.round((count / maxPeakCount) * 72)) : 0;
                return (
                  <div key={h} className="flex flex-col items-center flex-1">
                    {count > 0 && (
                      <div
                        className="w-full rounded-t bg-[#0891B2]"
                        style={{ height: barH }}
                        title={`${h}h — ${count} RDV`}
                      />
                    )}
                    {count === 0 && <div className="w-full" style={{ height: 0 }} />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
            {peaks.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Créneau le plus chargé :{" "}
                <span className="font-medium text-[#134E4A]">
                  {peaks.reduce((a, b) => (a.count > b.count ? a : b)).hour}h
                </span>
                {" "}avec{" "}
                <span className="font-medium text-[#134E4A]">
                  {peaks.reduce((a, b) => (a.count > b.count ? a : b)).count}
                </span>{" "}
                RDV
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "teal" | "green" | "orange" | "red" | "purple";
}) {
  const valueColors: Record<string, string> = {
    teal: "text-[#0891B2]",
    green: "text-green-600",
    orange: "text-orange-600",
    red: "text-red-600",
    purple: "text-purple-600",
  };
  return (
    <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${valueColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

function PatientBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-[#134E4A]">{label}</span>
        <span className="text-gray-500">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-3 bg-[#F0FDFA] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
