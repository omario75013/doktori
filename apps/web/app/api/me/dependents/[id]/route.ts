import { NextRequest, NextResponse } from "next/server";
import { db, patientDependents } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const [row] = await db
    .select()
    .from(patientDependents)
    .where(and(eq(patientDependents.id, id), eq(patientDependents.patientId, patient.id)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(row);
}

const patchSchema = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  gender: z.enum(["M", "F"]).optional().nullable(),
  relationship: z.string().trim().max(30).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.firstName || data.lastName) {
    // need both — fetch existing to merge
    const [existing] = await db
      .select({ name: patientDependents.name })
      .from(patientDependents)
      .where(and(eq(patientDependents.id, id), eq(patientDependents.patientId, patient.id)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    const parts = existing.name.split(/\s+/);
    const oldFirst = parts[0] ?? "";
    const oldLast = parts.slice(1).join(" ");
    update.name = `${data.firstName ?? oldFirst} ${data.lastName ?? oldLast}`.trim();
  }
  if (data.dob !== undefined) update.dateOfBirth = data.dob;
  if (data.gender !== undefined) update.gender = data.gender;
  if (data.relationship !== undefined) update.relation = data.relationship;

  const [row] = await db
    .update(patientDependents)
    .set(update)
    .where(and(eq(patientDependents.id, id), eq(patientDependents.patientId, patient.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  // Hard delete (no deleted_at column on this table)
  const [row] = await db
    .delete(patientDependents)
    .where(and(eq(patientDependents.id, id), eq(patientDependents.patientId, patient.id)))
    .returning({ id: patientDependents.id });

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
