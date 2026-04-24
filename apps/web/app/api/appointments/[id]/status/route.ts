import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";
import { applyNoShowPolicy } from "@/lib/noshow-policy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Patient path: can only cancel their own appointment
  const patientPayload = getPatientFromRequest(req);
  if (patientPayload) {
    const { id } = await params;
    const { status } = await req.json().catch(() => ({}));
    if (status !== "cancelled") {
      return NextResponse.json({ error: "Les patients ne peuvent qu'annuler" }, { status: 403 });
    }
    const [appt] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.patientId, patientPayload.id)))
      .limit(1);
    if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    const [updated] = await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return NextResponse.json(updated);
  }

  try {
    const user = await requireAuth(req);
    if (!user || (user.role !== "doctor" && user.role !== "secretary"))
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const doctorId = user.role === "doctor" ? user.id : (user as { doctorId: string }).doctorId;

    const { id } = await params;
    const { status } = await req.json();

    if (!["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    // Load current row to detect transitions before we overwrite status
    const [current] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.doctorId, doctorId)))
      .limit(1);
    if (!current) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

    const now = new Date();

    const [updated] = await db
      .update(appointments)
      .set({ status, updatedAt: now })
      .where(and(eq(appointments.id, id), eq(appointments.doctorId, doctorId)))
      .returning();

    // Reliability counters — only bump on a true transition into the flagged state
    if (status === "no_show" && current.status !== "no_show") {
      await db
        .update(patients)
        .set({ noShowCount: sql`${patients.noShowCount} + 1` })
        .where(eq(patients.id, current.patientId));

      // Apply no-show policy: auto-suspend if threshold reached, then notify patient
      applyNoShowPolicy({
        patientId: current.patientId,
        appointmentId: id,
        doctorId: doctorId,
      }).catch((e) => console.error("[status] applyNoShowPolicy failed:", e));
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api//appointments/[id]/status]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
