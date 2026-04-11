import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments, patients, patientMedicalProfile } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the patient — verify they have at least one appointment with this doctor
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  // Fetch all appointments for this patient filtered by the authenticated doctor
  const history = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, id),
        eq(appointments.doctorId, session.user.id)
      )
    )
    .orderBy(desc(appointments.startsAt));

  // Ensure the doctor has at least one appointment with this patient (authorization check)
  if (history.length === 0) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const [medical] = await db
    .select()
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, id))
    .limit(1);

  return NextResponse.json({ patient, appointments: history, medical: medical ?? null });
}
