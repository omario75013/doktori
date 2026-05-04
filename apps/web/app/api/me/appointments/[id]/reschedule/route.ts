import { NextRequest, NextResponse } from "next/server";
import { db, appointments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const bodySchema = z.object({
  newSlotAt: z.string().datetime({ offset: true }),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "newSlotAt invalide" }, { status: 400 });
  }

  const [old] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.patientId, patient.id)))
    .limit(1);

  if (!old) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  if (old.status === "cancelled" || old.status === "completed") {
    return NextResponse.json({ error: "RDV non reprogrammable" }, { status: 400 });
  }

  const newStarts = new Date(parsed.data.newSlotAt);
  const durationMs = old.endsAt.getTime() - old.startsAt.getTime();
  const newEnds = new Date(newStarts.getTime() + durationMs);

  const now = new Date();

  // Create new appointment with rescheduled_from_id
  const [created] = await db
    .insert(appointments)
    .values({
      doctorId: old.doctorId,
      patientId: old.patientId,
      practiceId: old.practiceId,
      appointmentTypeId: old.appointmentTypeId,
      dependentId: old.dependentId,
      startsAt: newStarts,
      endsAt: newEnds,
      type: old.type,
      reason: old.reason,
      notes: old.notes,
      status: "pending",
      rescheduledFromId: old.id,
    })
    .returning();

  // Cancel old
  await db
    .update(appointments)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancellationReason: "Reprogrammé",
      updatedAt: now,
    })
    .where(eq(appointments.id, old.id));

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
