import { NextResponse, NextRequest } from "next/server";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { db, medicalCertificates, doctors, appointments } from "@doktori/db";
import { eq, desc } from "drizzle-orm";

// Patient-side: returns every certificate issued for the calling
// patient. leftJoin on appointments because certificates may be
// emitted outside of an appointment (e.g. a follow-up letter for an
// older visit) — those rows still need to show up.
export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const results = await db
      .select({
        id: medicalCertificates.id,
        title: medicalCertificates.title,
        content: medicalCertificates.content,
        createdAt: medicalCertificates.createdAt,
        doctorName: doctors.name,
        doctorSpecialty: doctors.specialty,
        appointmentDate: appointments.startsAt,
      })
      .from(medicalCertificates)
      .innerJoin(doctors, eq(medicalCertificates.doctorId, doctors.id))
      .leftJoin(appointments, eq(medicalCertificates.appointmentId, appointments.id))
      .where(eq(medicalCertificates.patientId, patient.id))
      .orderBy(desc(medicalCertificates.createdAt))
      .limit(100);

    return NextResponse.json(results);
  } catch (e) {
    console.error("[GET /api/medical-certificates/patient]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
