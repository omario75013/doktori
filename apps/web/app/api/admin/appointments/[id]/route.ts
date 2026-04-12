import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  db,
  appointments,
  doctors,
  patients,
  consultationNotes,
  prescriptions,
} from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [row] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      practiceId: appointments.practiceId,
      reason: appointments.reason,
      notes: appointments.notes,
      confirmedAt: appointments.confirmedAt,
      cancelledAt: appointments.cancelledAt,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      doctorId: appointments.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorCity: doctors.city,
      patientId: appointments.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
      patientEmail: patients.email,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(eq(appointments.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  const [notes, [prescription]] = await Promise.all([
    db
      .select()
      .from(consultationNotes)
      .where(eq(consultationNotes.appointmentId, id))
      .limit(1),
    db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.appointmentId, id))
      .limit(1),
  ]);

  const consultNote = notes[0] ?? null;

  return NextResponse.json({
    appointment: {
      ...row,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    consultationNote: consultNote
      ? {
          id: consultNote.id,
          subjective: consultNote.subjective,
          objective: consultNote.objective,
          assessment: consultNote.assessment,
          plan: consultNote.plan,
          vitals: consultNote.vitals,
          icd10Codes: consultNote.icd10Codes,
          createdAt: consultNote.createdAt.toISOString(),
          updatedAt: consultNote.updatedAt.toISOString(),
        }
      : null,
    prescription: prescription
      ? {
          id: prescription.id,
          content: prescription.content,
          createdAt: prescription.createdAt.toISOString(),
        }
      : null,
  });
}
