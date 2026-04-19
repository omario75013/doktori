import { NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  clinicDoctors,
} from "@doktori/db";
import { eq, inArray, desc, count, max, and } from "drizzle-orm";
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
    return NextResponse.json({ patients: [] });
  }

  // Aggregate per patient: appointment count + last visit date
  const patientAgg = await db
    .select({
      patientId: appointments.patientId,
      appointmentCount: count(appointments.id),
      lastVisit: max(appointments.startsAt),
    })
    .from(appointments)
    .where(inArray(appointments.doctorId, allDoctorIds))
    .groupBy(appointments.patientId)
    .orderBy(desc(max(appointments.startsAt)))
    .limit(500);

  if (patientAgg.length === 0) {
    return NextResponse.json({ patients: [] });
  }

  const patientIds = patientAgg.map((r) => r.patientId);

  // Fetch patient details
  const patientRows = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
    })
    .from(patients)
    .where(inArray(patients.id, patientIds));

  // For each patient, find the most recent appointment's doctor — via a single query
  // Fetch the last appointment per patient (most recent startsAt) within clinic doctors
  const lastApptRows = await db
    .select({
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      startsAt: appointments.startsAt,
    })
    .from(appointments)
    .where(
      and(
        inArray(appointments.doctorId, allDoctorIds),
        inArray(appointments.patientId, patientIds)
      )
    )
    .orderBy(desc(appointments.startsAt));

  // Build map: patientId → last doctorId (first occurrence after ordering by desc)
  const lastDoctorByPatient = new Map<string, string>();
  for (const row of lastApptRows) {
    if (!lastDoctorByPatient.has(row.patientId)) {
      lastDoctorByPatient.set(row.patientId, row.doctorId);
    }
  }

  const lastDoctorIds = [...new Set(lastDoctorByPatient.values())];

  // Fetch doctor names for last-seen
  const doctorRows =
    lastDoctorIds.length > 0
      ? await db
          .select({ id: doctors.id, name: doctors.name })
          .from(doctors)
          .where(inArray(doctors.id, lastDoctorIds))
      : [];

  const patientMap = new Map(patientRows.map((p) => [p.id, p]));
  const doctorMap = new Map(doctorRows.map((d) => [d.id, d.name]));

  const result = patientAgg.map((agg) => {
    const patient = patientMap.get(agg.patientId);
    const lastDoctorId = lastDoctorByPatient.get(agg.patientId);
    return {
      id: agg.patientId,
      name: patient?.name ?? "—",
      phone: patient?.phone ?? "—",
      email: patient?.email ?? null,
      appointmentCount: Number(agg.appointmentCount),
      lastVisit: agg.lastVisit,
      lastDoctorName: lastDoctorId ? (doctorMap.get(lastDoctorId) ?? "—") : "—",
    };
  });

  return NextResponse.json({ patients: result });
}
