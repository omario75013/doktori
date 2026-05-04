import { NextRequest, NextResponse } from "next/server";
import { db, chronicTreatmentReminders } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const patchSchema = z
  .object({
    medicationName: z.string().trim().min(1).max(160).optional(),
    dosage: z.string().trim().max(80).nullable().optional(),
    frequencyHours: z.number().int().min(1).max(24 * 30).optional(),
    channel: z.enum(["sms", "email", "push"]).optional(),
    active: z.boolean().optional(),
    pausedUntil: z.string().datetime().nullable().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.medicationName !== undefined) updates.medicationName = parsed.data.medicationName;
  if (parsed.data.dosage !== undefined) updates.dosage = parsed.data.dosage;
  if (parsed.data.frequencyHours !== undefined) {
    updates.frequencyHours = parsed.data.frequencyHours;
    updates.nextReminderAt = new Date(Date.now() + parsed.data.frequencyHours * 3600 * 1000);
  }
  if (parsed.data.channel !== undefined) updates.notificationChannel = parsed.data.channel;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;
  if (parsed.data.pausedUntil !== undefined) {
    updates.pausedUntil = parsed.data.pausedUntil ? new Date(parsed.data.pausedUntil) : null;
  }

  const [row] = await db
    .update(chronicTreatmentReminders)
    .set(updates)
    .where(
      and(
        eq(chronicTreatmentReminders.id, id),
        eq(chronicTreatmentReminders.patientId, patient.id)
      )
    )
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ reminder: row });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const [row] = await db
    .update(chronicTreatmentReminders)
    .set({ active: false, updatedAt: new Date() })
    .where(
      and(
        eq(chronicTreatmentReminders.id, id),
        eq(chronicTreatmentReminders.patientId, patient.id)
      )
    )
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
