import { NextRequest, NextResponse } from "next/server";
import { db, childVaccinationRecords, patientDependents } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

async function ownsDependent(patientId: string, dependentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: patientDependents.id })
    .from(patientDependents)
    .where(and(eq(patientDependents.id, dependentId), eq(patientDependents.patientId, patientId)))
    .limit(1);
  return Boolean(row);
}

const patchSchema = z
  .object({
    doseNumber: z.number().int().min(1).max(10).optional(),
    dateReceived: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: dependentId, recordId } = await params;
  if (!(await ownsDependent(patient.id, dependentId))) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.doseNumber !== undefined) updates.doseNumber = parsed.data.doseNumber;
  if (parsed.data.dateReceived !== undefined) updates.dateReceived = parsed.data.dateReceived;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune mise à jour" }, { status: 400 });
  }

  const [row] = await db
    .update(childVaccinationRecords)
    .set(updates)
    .where(
      and(
        eq(childVaccinationRecords.id, recordId),
        eq(childVaccinationRecords.patientId, patient.id),
        eq(childVaccinationRecords.dependentId, dependentId)
      )
    )
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ record: row });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: dependentId, recordId } = await params;
  if (!(await ownsDependent(patient.id, dependentId))) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const [row] = await db
    .delete(childVaccinationRecords)
    .where(
      and(
        eq(childVaccinationRecords.id, recordId),
        eq(childVaccinationRecords.patientId, patient.id),
        eq(childVaccinationRecords.dependentId, dependentId)
      )
    )
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
