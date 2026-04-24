import { NextResponse, NextRequest } from "next/server";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { db, appointments } from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  let body: { type?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { type, note } = body;

  if (type !== "reschedule" && type !== "cancel") {
    return NextResponse.json({ error: "type doit être 'reschedule' ou 'cancel'" }, { status: 400 });
  }

  try {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.patientId, patient.id)))
      .limit(1);

    if (!appt) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }

    if (!["pending", "confirmed"].includes(appt.status)) {
      return NextResponse.json(
        { error: "Ce RDV ne peut pas être modifié (statut invalide)" },
        { status: 422 }
      );
    }

    const newStatus =
      type === "reschedule" ? "reschedule_requested" : "cancel_requested";

    const noteText = note ? `[Patient] ${note}` : null;

    const [updated] = await db
      .update(appointments)
      .set({
        status: newStatus,
        notes: noteText ?? appt.notes,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning({ status: appointments.status });

    return NextResponse.json({ ok: true, status: updated.status });
  } catch (e) {
    console.error("[POST /api/appointments/[id]/change-request]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
