import { NextRequest, NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  clinicDoctors,
} from "@doktori/db";
import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = new URL(req.url);
  const doctorFilter = searchParams.get("doctorId");
  const statusFilter = searchParams.get("status");
  const dateFilter = searchParams.get("date"); // today | tomorrow | week

  // Resolve all doctor IDs in this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (allDoctorIds.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  // Determine doctor scope (one specific doctor or all)
  const targetDoctorIds =
    doctorFilter && allDoctorIds.includes(doctorFilter)
      ? [doctorFilter]
      : allDoctorIds;

  // Build date range
  const now = new Date();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  if (dateFilter === "today") {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (dateFilter === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateFrom = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
    dateTo = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);
  } else if (dateFilter === "week") {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    dateFrom = now;
    dateTo = weekEnd;
  }

  // Build where conditions
  const conditions = [inArray(appointments.doctorId, targetDoctorIds)];

  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(appointments.status, statusFilter));
  }

  if (dateFrom) {
    conditions.push(gte(appointments.startsAt, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(appointments.startsAt, dateTo));
  }

  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      checkedInAt: appointments.checkedInAt,
      confirmedAt: appointments.confirmedAt,
      cancelledAt: appointments.cancelledAt,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.startsAt))
    .limit(200);

  return NextResponse.json({ appointments: rows });
}
