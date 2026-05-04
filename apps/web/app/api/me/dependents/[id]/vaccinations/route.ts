import { NextRequest, NextResponse } from "next/server";
import { db, childVaccinationRecords, vaccineInfoContent, patientDependents } from "@doktori/db";
import { and, asc, eq, desc } from "drizzle-orm";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: dependentId } = await params;
  if (!(await ownsDependent(patient.id, dependentId))) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const [records, schedule] = await Promise.all([
    db
      .select()
      .from(childVaccinationRecords)
      .where(
        and(
          eq(childVaccinationRecords.patientId, patient.id),
          eq(childVaccinationRecords.dependentId, dependentId)
        )
      )
      .orderBy(desc(childVaccinationRecords.dateReceived)),
    db
      .select()
      .from(vaccineInfoContent)
      .orderBy(asc(vaccineInfoContent.displayOrder)),
  ]);

  return NextResponse.json({ records, schedule });
}

const createSchema = z
  .object({
    vaccineSlug: z.string().trim().min(1).max(60),
    doseNumber: z.number().int().min(1).max(10).default(1),
    dateReceived: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: dependentId } = await params;
  if (!(await ownsDependent(patient.id, dependentId))) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }

  const [row] = await db
    .insert(childVaccinationRecords)
    .values({
      patientId: patient.id,
      dependentId,
      vaccineSlug: parsed.data.vaccineSlug,
      doseNumber: parsed.data.doseNumber,
      dateReceived: parsed.data.dateReceived,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return NextResponse.json({ record: row }, { status: 201 });
}
