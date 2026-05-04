import { NextRequest, NextResponse } from "next/server";
import { db, patientVaccinations } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const patchSchema = z.object({
  vaccineName: z.string().trim().min(1).max(120).optional(),
  dateReceived: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  batchNumber: z.string().trim().max(60).optional().nullable(),
  givenBy: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
  }

  const [updated] = await db
    .update(patientVaccinations)
    .set(update)
    .where(and(eq(patientVaccinations.id, id), eq(patientVaccinations.patientId, patient.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ vaccination: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const [deleted] = await db
    .delete(patientVaccinations)
    .where(and(eq(patientVaccinations.id, id), eq(patientVaccinations.patientId, patient.id)))
    .returning({ id: patientVaccinations.id });

  if (!deleted) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
