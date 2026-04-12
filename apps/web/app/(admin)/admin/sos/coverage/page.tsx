import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface CityRow {
  city: string;
  totalRequests: number;
  expiredCount: number;
  expiredPct: number;
  acceptedCount: number;
  availableDoctors: number;
}

export default async function SosCoveragePage() {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) redirect("/admin-login");

  const [doctorCountsResult, sessionsByCityResult] = await Promise.all([
    db.execute(sql`
      SELECT d.city, COUNT(*)::int AS count
      FROM doctors d
      JOIN doctor_home_visit_settings dhvs ON dhvs.doctor_id = d.id
      WHERE dhvs.is_available = true AND d.is_active = true AND d.city IS NOT NULL
      GROUP BY d.city
      ORDER BY count DESC
    `),

    db.execute(sql`
      SELECT
        COALESCE(d.city, 'inconnue') AS city,
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE s.status = 'expired')::int AS expired_count,
        COUNT(*) FILTER (WHERE s.status IN ('accepted','completed'))::int AS accepted_count
      FROM sos_sessions s
      LEFT JOIN doctors d ON d.id = s.doctor_id
      WHERE s.requested_at >= NOW() - INTERVAL '30 days'
      GROUP BY d.city
      ORDER BY total_requests DESC
    `),
  ]);

  const doctorCounts = doctorCountsResult as unknown as { city: string; count: number }[];
  const doctorCountMap = new Map(doctorCounts.map((r) => [r.city, r.count]));

  const sessionsByCity = sessionsByCityResult as unknown as {
    city: string;
    total_requests: number;
    expired_count: number;
    accepted_count: number;
  }[];

  const citiesTable: CityRow[] = sessionsByCity.map((r) => ({
    city: r.city,
    totalRequests: r.total_requests,
    expiredCount: r.expired_count,
    expiredPct: r.total_requests > 0 ? Math.round((r.expired_count / r.total_requests) * 100) : 0,
    acceptedCount: r.accepted_count,
    availableDoctors: doctorCountMap.get(r.city) ?? 0,
  }));

  const noDoctorCount = citiesTable.filter((c) => c.availableDoctors === 0).length;
  const highExpiredCount = citiesTable.filter((c) => c.expiredPct > 50 && c.totalRequests >= 3).length;
  const goodCount = citiesTable.filter((c) => c.availableDoctors > 0 && c.expiredPct <= 50).length;

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Couverture SOS</h1>
        <p className="text-slate-500 mt-1">Analyse de couverture géographique — 30 derniers jours</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{noDoctorCount}</p>
            <p className="text-sm text-red-600">Villes sans médecin SOS</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{highExpiredCount}</p>
            <p className="text-sm text-amber-600">Villes avec &gt;50% expirées</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">{goodCount}</p>
            <p className="text-sm text-green-600">Villes bien couvertes</p>
          </div>
        </div>
      </div>

      {/* Cities table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Couverture par ville
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Ville</th>
                <th className="px-5 py-3 font-semibold text-right">Demandes</th>
                <th className="px-5 py-3 font-semibold text-right">Expirées</th>
                <th className="px-5 py-3 font-semibold text-right">Taux expiration</th>
                <th className="px-5 py-3 font-semibold text-right">Médecins SOS</th>
                <th className="px-5 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {citiesTable.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Aucune donnée disponible
                  </td>
                </tr>
              )}
              {citiesTable.map((row) => {
                const isNone = row.availableDoctors === 0;
                const isLow = !isNone && row.expiredPct > 50 && row.totalRequests >= 3;
                const rowBg = isNone
                  ? "bg-red-50 hover:bg-red-100"
                  : isLow
                    ? "bg-amber-50 hover:bg-amber-100"
                    : "hover:bg-slate-50";

                return (
                  <tr key={row.city} className={rowBg}>
                    <td className="px-5 py-3 font-medium text-slate-900 capitalize">{row.city}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700">{row.totalRequests}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700">{row.expiredCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={row.expiredPct > 50 ? "text-red-700 font-semibold" : "text-slate-700"}>
                        {row.expiredPct}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700">{row.availableDoctors}</td>
                    <td className="px-5 py-3">
                      {isNone ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Aucun médecin
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          <AlertCircle className="w-3 h-3" /> Couverture faible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" /> Adéquate
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
