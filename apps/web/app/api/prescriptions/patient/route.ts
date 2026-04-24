import { NextResponse, NextRequest } from "next/server";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { db, prescriptions, doctors, appointments } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const results = await db
      .select({
        id: prescriptions.id,
        content: prescriptions.content,
        createdAt: prescriptions.createdAt,
        doctorName: doctors.name,
        doctorSpecialty: doctors.specialty,
        appointmentDate: appointments.startsAt,
      })
      .from(prescriptions)
      .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
      .innerJoin(appointments, eq(prescriptions.appointmentId, appointments.id))
      .where(eq(prescriptions.patientId, patient.id))
      .orderBy(desc(prescriptions.createdAt))
      .limit(50);

    return NextResponse.json(results);
  } catch (e) {
    console.error("[GET /api/prescriptions/patient]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
