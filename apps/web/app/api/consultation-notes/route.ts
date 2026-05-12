import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, consultationNotes, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { appointmentId, subjective, objective, assessment, plan, vitals, icd10_codes } = body;

    if (!appointmentId || typeof appointmentId !== "string") {
      return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });
    }

    // Verify the doctor owns this appointment
    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, session.user.id)))
      .limit(1);

    if (!appt) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }
    // appointments.patient_id is technically nullable (anonymous walk-in
    // bookings); consultation_notes.patient_id is NOT NULL. Without this
    // guard the INSERT throws a constraint violation and the SOAP note
    // POST 500s instead of returning a clean 400.
    if (!appt.patientId) {
      return NextResponse.json(
        { error: "Ce RDV n'a pas de patient lié — créez d'abord la fiche patient." },
        { status: 400 },
      );
    }

    const [row] = await db
      .insert(consultationNotes)
      .values({
        appointmentId: appt.id,
        doctorId: session.user.id,
        patientId: appt.patientId,
        subjective: subjective ?? null,
        objective: objective ?? null,
        assessment: assessment ?? null,
        plan: plan ?? null,
        vitals: vitals ?? null,
        icd10Codes: icd10_codes ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: consultationNotes.appointmentId,
        set: {
          subjective: subjective ?? null,
          objective: objective ?? null,
          assessment: assessment ?? null,
          plan: plan ?? null,
          vitals: vitals ?? null,
          icd10Codes: icd10_codes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("[POST /api//consultation-notes]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
