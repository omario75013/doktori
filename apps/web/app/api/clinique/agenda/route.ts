import { NextRequest, NextResponse } from "next/server";
import { db, clinics, clinicDoctors, doctors, appointments, patients } from "@doktori/db";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);

  let clinicId: string;
  if (role === "clinic") {
    clinicId = session.user.id;
  } else if (role === "admin") {
    clinicId = searchParams.get("id") ?? "";
  } else {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  if (!clinicId) {
    return NextResponse.json(
      { error: "clinicId requis" },
      { status: 400 }
    );
  }

  const dateParam = searchParams.get("date"); // YYYY-MM-DD
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: "Paramètre ?date=YYYY-MM-DD requis" },
      { status: 400 }
    );
  }

  // Verify clinic exists
  const [clinic] = await db
    .select({ id: clinics.id, name: clinics.name })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!clinic) {
    return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });
  }

  // Doctors linked to this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinicId));

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (doctorIds.length === 0) {
    return NextResponse.json([]);
  }

  // Day boundaries in local time (server treats date as UTC midnight)
  const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateParam}T23:59:59.999Z`);

  // Fetch all appointments for the day across all clinic doctors
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      reason: appointments.reason,
      doctorId: appointments.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        inArray(appointments.doctorId, doctorIds),
        gte(appointments.startsAt, dayStart),
        lt(appointments.startsAt, dayEnd),
      )
    )
    .orderBy(appointments.startsAt);

  return NextResponse.json(rows);
}
