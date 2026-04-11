import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, consultationNotes, appointments } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: patientId } = await params;

  // Verify this doctor has at least one appointment with this patient
  const [ownerCheck] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(eq(appointments.patientId, patientId), eq(appointments.doctorId, session.user.id))
    )
    .limit(1);

  if (!ownerCheck) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  // Fetch all consultation notes for this patient joined with appointment startsAt
  const rows = await db
    .select({
      id: consultationNotes.id,
      appointmentId: consultationNotes.appointmentId,
      subjective: consultationNotes.subjective,
      objective: consultationNotes.objective,
      assessment: consultationNotes.assessment,
      plan: consultationNotes.plan,
      vitals: consultationNotes.vitals,
      icd10Codes: consultationNotes.icd10Codes,
      createdAt: consultationNotes.createdAt,
      updatedAt: consultationNotes.updatedAt,
      startsAt: appointments.startsAt,
    })
    .from(consultationNotes)
    .innerJoin(appointments, eq(consultationNotes.appointmentId, appointments.id))
    .where(
      and(
        eq(consultationNotes.patientId, patientId),
        eq(consultationNotes.doctorId, session.user.id)
      )
    )
    .orderBy(desc(appointments.startsAt));

  return NextResponse.json(rows);
}
