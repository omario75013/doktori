import { db, doctors, appointments } from "@doktori/db";
import { count, sql, eq } from "drizzle-orm";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const [doctorsByCity, doctorsBySpecialty, appointmentsByStatus] = await Promise.all([
    db
      .select({ city: doctors.city, total: count() })
      .from(doctors)
      .where(eq(doctors.isActive, true))
      .groupBy(doctors.city)
      .orderBy(sql`count(*) desc`),
    db
      .select({ specialty: doctors.specialty, total: count() })
      .from(doctors)
      .where(eq(doctors.isActive, true))
      .groupBy(doctors.specialty)
      .orderBy(sql`count(*) desc`),
    db
      .select({ status: appointments.status, total: count() })
      .from(appointments)
      .groupBy(appointments.status)
      .orderBy(sql`count(*) desc`),
  ]);

  const renderBars = (rows: Array<{ label: string; total: number }>) => {
    const max = Math.max(...rows.map((r) => r.total), 1);
    return (
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <div className="w-32 text-sm text-slate-700 capitalize truncate">
              {r.label}
            </div>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-teal-600"
                style={{ width: `${(r.total / max) * 100}%` }}
              />
            </div>
            <div className="w-10 text-sm text-slate-600 text-right">{r.total}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Statistiques</h1>
          <p className="text-slate-500 mt-1">Répartition des médecins et rendez-vous</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Par spécialité
          </h2>
          {renderBars(
            doctorsBySpecialty.map((r) => ({ label: r.specialty, total: Number(r.total) }))
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Par ville</h2>
          {renderBars(
            doctorsByCity.map((r) => ({ label: r.city, total: Number(r.total) }))
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Rendez-vous par statut
          </h2>
          {renderBars(
            appointmentsByStatus.map((r) => ({
              label: r.status,
              total: Number(r.total),
            }))
          )}
        </div>
      </div>
    </div>
  );
}
