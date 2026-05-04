import { NextRequest, NextResponse } from "next/server";
import { db, patientPregnancies } from "@doktori/db";
import { and, eq, isNull, desc } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { computePregnancyWeek } from "@/lib/pregnancy";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(patientPregnancies)
    .where(and(eq(patientPregnancies.patientId, patient.id), isNull(patientPregnancies.endedAt)))
    .orderBy(desc(patientPregnancies.createdAt))
    .limit(1);

  const active = rows[0] ?? null;
  const currentWeek = active ? computePregnancyWeek(active.dueDate) : null;

  return NextResponse.json({ pregnancy: active, currentWeek });
}

const createSchema = z
  .object({
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

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

  // End any existing active pregnancy first
  await db
    .update(patientPregnancies)
    .set({ endedAt: new Date().toISOString().slice(0, 10) })
    .where(and(eq(patientPregnancies.patientId, patient.id), isNull(patientPregnancies.endedAt)));

  const [row] = await db
    .insert(patientPregnancies)
    .values({
      patientId: patient.id,
      dueDate: parsed.data.dueDate,
      startDate: parsed.data.startDate ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return NextResponse.json({ pregnancy: row, currentWeek: computePregnancyWeek(row.dueDate) }, { status: 201 });
}
