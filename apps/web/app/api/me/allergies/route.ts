import { NextRequest, NextResponse } from "next/server";
import { db, patientAllergies } from "@doktori/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(patientAllergies)
    .where(eq(patientAllergies.patientId, patient.id))
    .orderBy(desc(patientAllergies.createdAt));

  return NextResponse.json({ allergies: rows });
}

const SEVERITIES = ["mild", "moderate", "severe"] as const;

const createSchema = z.object({
  allergen: z.string().trim().min(1).max(160),
  severity: z.enum(SEVERITIES),
  reaction: z.string().trim().max(2000).optional().nullable(),
  diagnosedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
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
    .insert(patientAllergies)
    .values({
      patientId: patient.id,
      allergen: parsed.data.allergen,
      severity: parsed.data.severity,
      reaction: parsed.data.reaction ?? null,
      diagnosedAt: parsed.data.diagnosedAt ?? null,
    })
    .returning();

  return NextResponse.json({ allergy: row }, { status: 201 });
}
