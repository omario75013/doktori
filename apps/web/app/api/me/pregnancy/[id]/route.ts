import { NextRequest, NextResponse } from "next/server";
import { db, patientPregnancies } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const patchSchema = z
  .object({
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
    endedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.dueDate !== undefined) updates.dueDate = parsed.data.dueDate;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.endedAt !== undefined) updates.endedAt = parsed.data.endedAt;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune mise à jour" }, { status: 400 });
  }

  const [row] = await db
    .update(patientPregnancies)
    .set(updates)
    .where(and(eq(patientPregnancies.id, id), eq(patientPregnancies.patientId, patient.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ pregnancy: row });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const [row] = await db
    .update(patientPregnancies)
    .set({ endedAt: new Date().toISOString().slice(0, 10) })
    .where(and(eq(patientPregnancies.id, id), eq(patientPregnancies.patientId, patient.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
