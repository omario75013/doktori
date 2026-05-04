import { NextRequest, NextResponse } from "next/server";
import { db, patientMedications } from "@doktori/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(patientMedications)
    .where(eq(patientMedications.patientId, patient.id))
    .orderBy(desc(patientMedications.createdAt));

  return NextResponse.json({ medications: rows });
}

const createSchema = z.object({
  medicationName: z.string().trim().min(1).max(160),
  dosage: z.string().trim().max(80).optional().nullable(),
  frequency: z.string().trim().max(80).optional().nullable(),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
}).strict();

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .insert(patientMedications)
    .values({
      patientId: patient.id,
      medicationName: parsed.data.medicationName,
      dosage: parsed.data.dosage ?? null,
      frequency: parsed.data.frequency ?? null,
      startedAt: parsed.data.startedAt ?? null,
      endedAt: parsed.data.endedAt ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return NextResponse.json({ medication: row }, { status: 201 });
}
