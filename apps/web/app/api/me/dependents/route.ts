import { NextRequest, NextResponse } from "next/server";
import { db, patientDependents } from "@doktori/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(patientDependents)
    .where(eq(patientDependents.patientId, patient.id))
    .orderBy(desc(patientDependents.createdAt));

  return NextResponse.json({ items: rows });
}

const postSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  gender: z.enum(["M", "F"]).optional().nullable(),
  relationship: z.string().trim().max(30).optional().nullable(),
  // Stored in `name` only (schema is minimal); kept for future fields
  bloodType: z.string().optional().nullable(),
  cin: z.string().optional().nullable(),
  cnamNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  const [row] = await db
    .insert(patientDependents)
    .values({
      patientId: patient.id,
      name: fullName,
      dateOfBirth: data.dob ?? null,
      gender: data.gender ?? null,
      relation: data.relationship ?? null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
