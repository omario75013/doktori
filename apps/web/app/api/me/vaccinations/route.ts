import { NextRequest, NextResponse } from "next/server";
import { db, patientVaccinations } from "@doktori/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(patientVaccinations)
    .where(eq(patientVaccinations.patientId, patient.id))
    .orderBy(desc(patientVaccinations.dateReceived));

  return NextResponse.json({ vaccinations: rows });
}

const createSchema = z.object({
  vaccineName: z.string().trim().min(1).max(120),
  dateReceived: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  batchNumber: z.string().trim().max(60).optional().nullable(),
  givenBy: z.string().trim().max(120).optional().nullable(),
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
    .insert(patientVaccinations)
    .values({
      patientId: patient.id,
      vaccineName: parsed.data.vaccineName,
      dateReceived: parsed.data.dateReceived,
      batchNumber: parsed.data.batchNumber ?? null,
      givenBy: parsed.data.givenBy ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return NextResponse.json({ vaccination: row }, { status: 201 });
}
