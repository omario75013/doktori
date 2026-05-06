import { db, appointments, doctors, patients } from "@doktori/db";
import { and, gte, lte, eq } from "drizzle-orm";
import { AppointmentsTable } from "./appointments-table";
import Link from "next/link";
import { AlertTriangle, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentsPage() {
  // Default: today and tomorrow
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);

  const list = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      practiceId: appointments.practiceId,
      doctorId: appointments.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      patientId: appointments.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(gte(appointments.startsAt, from), lte(appointments.startsAt, to)))
    .orderBy(appointments.startsAt)
    .limit(500);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rendez-vous</h1>
          <p className="text-slate-500 mt-1">
            Aujourd&apos;hui et demain · {list.length} rendez-vous
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/rendez-vous/bulk"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Annulation en masse
          </Link>
          <Link
            href="/admin/rendez-vous/conflicts"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Conflits
          </Link>
        </div>
      </div>

      <AppointmentsTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appointments={(list as any[]).map((a) => ({
          id: a.id as string,
          startsAt: (a.startsAt as Date).toISOString(),
          endsAt: (a.endsAt as Date).toISOString(),
          status: a.status as string,
          type: a.type as string,
          practiceId: (a.practiceId ?? null) as string | null,
          doctorId: a.doctorId as string,
          doctorName: a.doctorName as string,
          doctorSpecialty: a.doctorSpecialty as string,
          patientId: a.patientId as string,
          patientName: a.patientName as string,
          patientPhone: a.patientPhone as string,
        }))}
      />
    </div>
  );
}
