import { NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  clinicDoctors,
  doctorPractices,
} from "@doktori/db";
import { eq, and, inArray, isNotNull, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  // Resolve all doctor IDs in this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (allDoctorIds.length === 0) {
    return NextResponse.json({ rooms: [], stats: { totalWaiting: 0, avgWaitMinutes: 0 } });
  }

  const now = new Date();

  const rows = await db
    .select({
      appointmentId: appointments.id,
      patientId: appointments.patientId,
      patientName: patients.name,
      doctorId: appointments.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      checkedInAt: appointments.checkedInAt,
      motif: appointments.reason,
      type: appointments.type,
      practiceId: appointments.practiceId,
      practiceName: doctorPractices.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(doctorPractices, eq(appointments.practiceId, doctorPractices.id))
    .where(
      and(
        inArray(appointments.doctorId, allDoctorIds),
        isNotNull(appointments.checkedInAt),
        inArray(appointments.status, ["confirmed", "pending"]),
        sql`${appointments.startsAt}::date = current_date`
      )
    );

  const rooms = rows.map((row) => {
    const checkedInAt = row.checkedInAt ?? now;
    const waitMinutes = Math.floor((now.getTime() - checkedInAt.getTime()) / 60_000);

    // Privacy: show initials only (first letter of each word)
    const initials = row.patientName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + ".")
      .join(" ");

    return {
      patientId: row.patientId,
      patientName: initials,
      doctorId: row.doctorId,
      doctorName: row.doctorName,
      doctorSpecialty: row.doctorSpecialty,
      appointmentId: row.appointmentId,
      checkedInAt: checkedInAt.toISOString(),
      waitMinutes,
      motif: row.motif ?? null,
      type: row.type,
      practiceId: row.practiceId ?? null,
      practiceName: row.practiceName ?? null,
    };
  });

  // Sort by wait time descending (longest wait first)
  rooms.sort((a, b) => b.waitMinutes - a.waitMinutes);

  const totalWaiting = rooms.length;
  const avgWaitMinutes =
    totalWaiting > 0
      ? Math.round(rooms.reduce((sum, r) => sum + r.waitMinutes, 0) / totalWaiting)
      : 0;

  return NextResponse.json({ rooms, stats: { totalWaiting, avgWaitMinutes } });
}
