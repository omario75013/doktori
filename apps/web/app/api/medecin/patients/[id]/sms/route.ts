import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, patients, appointments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: patientId } = await ctx.params;
    const { message } = await req.json();

    if (typeof message !== "string" || message.trim().length < 1 || message.length > 500) {
      return NextResponse.json({ error: "Message invalide (1-500 caractères)" }, { status: 400 });
    }

    // Verify the doctor has at least one prior appointment with this patient
    const [link] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(eq(appointments.doctorId, user.id), eq(appointments.patientId, patientId)))
      .limit(1);
    if (!link) {
      return NextResponse.json({ error: "Patient non lié au médecin" }, { status: 403 });
    }

    const [patient] = await db
      .select({ phone: patients.phone })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient?.phone) {
      return NextResponse.json({ error: "Patient sans téléphone" }, { status: 400 });
    }

    await sendSMS(patient.phone, message.trim());

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/medecin/patients/[id]/sms]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
