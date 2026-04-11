import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { PrintButton } from "@/components/print-button";

interface Props {
  params: Promise<{ doctorId: string; month: string }>;
}

export default async function MonthlyReportPage({ params }: Props) {
  const { doctorId, month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();

  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 1);

  const doctorResult = await db.execute(sql`
    SELECT id, name, specialty, city, consultation_fee
    FROM doctors WHERE id = ${doctorId} LIMIT 1
  `);
  const doctor = (doctorResult as unknown as any[])[0];
  if (!doctor) notFound();

  const stats = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_shows,
      COUNT(DISTINCT patient_id)::int AS unique_patients
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND starts_at >= ${startDate.toISOString()}
      AND starts_at < ${endDate.toISOString()}
  `);
  const s = (stats as unknown as any[])[0] || { total: 0, completed: 0, cancelled: 0, no_shows: 0, unique_patients: 0 };

  const specialty = SPECIALTIES.find((sp) => sp.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  const monthName = new Date(year, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  const noShowRate = s.total > 0 ? Math.round((s.no_shows / s.total) * 100) : 0;
  const feeInDT = doctor.consultation_fee ? doctor.consultation_fee / 1000 : 0;
  const revenueEstimate = s.completed * feeInDT;

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-4 bg-white min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-2 border-blue-600 pb-4 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Doktori</h1>
            <p className="text-sm text-gray-500">Rapport mensuel d&apos;activité</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Période</p>
            <p className="text-sm font-semibold">{monthName}</p>
          </div>
        </div>
      </div>

      {/* Doctor info */}
      <div className="mb-8">
        <h2 className="text-xl font-bold">{doctor.name}</h2>
        <p className="text-sm text-gray-600">{specialty?.label} · {city?.label}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-xs text-blue-700 uppercase font-semibold">Total RDV</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{s.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-xs text-green-700 uppercase font-semibold">Confirmés</p>
          <p className="text-3xl font-bold text-green-900 mt-1">{s.completed}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-xs text-red-700 uppercase font-semibold">No-shows</p>
          <p className="text-3xl font-bold text-red-900 mt-1">{s.no_shows}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-700 uppercase font-semibold">Patients</p>
          <p className="text-3xl font-bold text-amber-900 mt-1">{s.unique_patients}</p>
        </div>
      </div>

      {/* Rates */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="font-bold mb-4">Indicateurs clés</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Taux de confirmation</span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Taux no-show</span>
              <span className="font-semibold">{noShowRate}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-500" style={{ width: `${noShowRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue */}
      {revenueEstimate > 0 && (
        <div className="bg-blue-600 text-white rounded-lg p-6 mb-8">
          <p className="text-sm opacity-80">Revenus estimés ({s.completed} consultations × {feeInDT} DT)</p>
          <p className="text-4xl font-bold mt-2">{revenueEstimate.toLocaleString("fr-FR")} DT</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-center text-gray-400">
        <p>Généré automatiquement par Doktori · doktori.tn</p>
        <p className="mt-1">Ce rapport est basé sur les rendez-vous enregistrés sur la plateforme.</p>
      </div>

      {/* Print button */}
      <div className="no-print mt-6 text-center">
        <PrintButton />
      </div>
    </div>
  );
}
