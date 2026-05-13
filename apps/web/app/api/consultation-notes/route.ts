import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, consultationNotes, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const doctorId = user.role === "doctor" ? user.id : user.doctorId;

    const body = await req.json().catch(() => ({}));
    const { appointmentId, subjective, objective, assessment, plan, vitals, icd10_codes } = body;

    if (!appointmentId || typeof appointmentId !== "string") {
      return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });
    }

    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, doctorId)))
      .limit(1);

    if (!appt) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }
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
        doctorId,
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
    console.error("[POST /api/consultation-notes]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
