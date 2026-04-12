import { db, appointments, doctors, patients } from "@doktori/db";
import { eq, sql, inArray } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentConflictsPage() {
  // Find appointments that overlap with another appointment for the same doctor.
  // Two appointments overlap when: a.starts_at < b.ends_at AND a.ends_at > b.starts_at
  // Both must be non-cancelled (pending, confirmed, or completed).
  // We use a self-join at SQL level via raw SQL for efficiency.

  type ConflictRow = { id_a: string; id_b: string; doctor_id: string };

  const rawConflicts = await db.execute(sql`
    SELECT a.id AS id_a, b.id AS id_b, a.doctor_id
    FROM appointments a
    JOIN appointments b
      ON a.doctor_id = b.doctor_id
      AND a.id < b.id
      AND a.starts_at < b.ends_at
      AND a.ends_at > b.starts_at
      AND a.status IN ('pending', 'confirmed', 'completed')
      AND b.status IN ('pending', 'confirmed', 'completed')
    ORDER BY a.starts_at
    LIMIT 100
  `);

  const conflictRows = rawConflicts as unknown as ConflictRow[];

  // Collect all unique appointment IDs to fetch details
  const apptIds = Array.from(
    new Set(conflictRows.flatMap((r) => [r.id_a, r.id_b]))
  );

  if (apptIds.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link
          href="/admin/rendez-vous"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux rendez-vous
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertTriangle className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900">Aucun conflit détecté</h2>
          <p className="text-slate-500 text-sm mt-1">
            Tous les créneaux actifs sont cohérents.
          </p>
        </div>
      </div>
    );
  }

  const apptDetails = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      doctorName: doctors.name,
      patientName: patients.name,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(inArray(appointments.id, apptIds));

  type ApptDetail = {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    doctorName: string;
    patientName: string;
  };

  const apptMap = new Map(
    (apptDetails as unknown as ApptDetail[]).map((a) => [a.id, a])
  );

  function fmt(d: Date) {
    return d.toLocaleString("fr-TN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        href="/admin/rendez-vous"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux rendez-vous
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conflits de créneaux</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {conflictRows.length} conflit{conflictRows.length > 1 ? "s" : ""} détecté{conflictRows.length > 1 ? "s" : ""}
            {conflictRows.length === 100 ? " (limité à 100)" : ""}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">RDV A</th>
                <th className="px-4 py-3 font-semibold">RDV B</th>
                <th className="px-4 py-3 font-semibold">Médecin</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Résoudre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conflictRows.map((c, i) => {
                const a = apptMap.get(c.id_a);
                const b = apptMap.get(c.id_b);
                if (!a || !b) return null;
                return (
                  <tr key={i} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3">
                      <div className="text-slate-900 font-medium">{a.patientName}</div>
                      <div className="text-xs text-slate-500">
                        {fmt(a.startsAt)} – {fmt(a.endsAt)}
                      </div>
                      <span className={`inline-flex mt-1 px-1.5 py-0.5 text-xs rounded-full ${STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900 font-medium">{b.patientName}</div>
                      <div className="text-xs text-slate-500">
                        {fmt(b.startsAt)} – {fmt(b.endsAt)}
                      </div>
                      <span className={`inline-flex mt-1 px-1.5 py-0.5 text-xs rounded-full ${STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{a.doctorName}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/rendez-vous/${c.id_a}`}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                          title="Voir RDV A"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/admin/rendez-vous/${c.id_b}`}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                          title="Voir RDV B"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
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
