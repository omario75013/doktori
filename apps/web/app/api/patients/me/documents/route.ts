import { NextRequest, NextResponse } from "next/server";
import { db, prescriptions, cnamClaims, consultationNotes, appointments, doctors, medicalCertificates } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const patientId = patient.id;

  const [prescriptionRows, cnamRows, noteRows, certificateRows] = await Promise.all([
    db
      .select({
        prescriptionId: prescriptions.id,
        createdAt: prescriptions.createdAt,
        doctorName: doctors.name,
        specialty: doctors.specialty,
        startsAt: appointments.startsAt,
        type: appointments.type,
      })
      .from(prescriptions)
      // appointmentId is nullable since 0075_prescription_optional_appointment
      // — doctor can create a prescription outside of any appointment.
      // Use leftJoin so those standalone prescriptions still surface here.
      .leftJoin(appointments, eq(appointments.id, prescriptions.appointmentId))
      .innerJoin(doctors, eq(doctors.id, prescriptions.doctorId))
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt))
      .limit(50),

    db
      .select({
        id: cnamClaims.id,
        cnamNumber: cnamClaims.cnamNumber,
        amount: cnamClaims.amount,
        status: cnamClaims.status,
        consultationDate: cnamClaims.consultationDate,
        doctorName: doctors.name,
      })
      .from(cnamClaims)
      .innerJoin(appointments, eq(appointments.id, cnamClaims.appointmentId))
      .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
      .where(eq(cnamClaims.patientId, patientId))
      .orderBy(desc(cnamClaims.consultationDate))
      .limit(50),

    db
      .select({
        id: consultationNotes.id,
        assessment: consultationNotes.assessment,
        plan: consultationNotes.plan,
        createdAt: consultationNotes.createdAt,
        doctorName: doctors.name,
        startsAt: appointments.startsAt,
        type: appointments.type,
      })
      .from(consultationNotes)
      .innerJoin(appointments, eq(appointments.id, consultationNotes.appointmentId))
      .innerJoin(doctors, eq(doctors.id, consultationNotes.doctorId))
      .where(eq(consultationNotes.patientId, patientId))
      .orderBy(desc(consultationNotes.createdAt))
      .limit(50),

    db
      .select({
        certificateId: medicalCertificates.id,
        title: medicalCertificates.title,
        createdAt: medicalCertificates.createdAt,
        doctorName: doctors.name,
        specialty: doctors.specialty,
      })
      .from(medicalCertificates)
      .innerJoin(doctors, eq(doctors.id, medicalCertificates.doctorId))
      .where(eq(medicalCertificates.patientId, patientId))
      .orderBy(desc(medicalCertificates.createdAt))
      .limit(50),
  ]);

  return NextResponse.json({
    prescriptions: prescriptionRows,
    cnamClaims: cnamRows,
    consultationNotes: noteRows,
    certificates: certificateRows,
  });
}
