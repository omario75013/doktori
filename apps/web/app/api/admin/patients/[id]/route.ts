import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, patients, patientMedicalProfile, patientDependents } from "@doktori/db";
import { eq } from "drizzle-orm";

const ALLOWED_FIELDS = [
  "name",
  "phone",
  "email",
  "dateOfBirth",
  "gender",
  "bloodType",
  "cnamNumber",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const [medProfile] = await db
    .select()
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, id))
    .limit(1);

  const dependents = await db
    .select()
    .from(patientDependents)
    .where(eq(patientDependents.patientId, id));

  return NextResponse.json({ patient, medicalProfile: medProfile ?? null, dependents });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "support"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) updates[field as AllowedField] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    // Validate name and phone if present
    if ("name" in updates && (!updates.name || typeof updates.name !== "string" || !(updates.name as string).trim())) {
      return NextResponse.json({ error: "Le nom ne peut pas être vide" }, { status: 422 });
    }
    if ("phone" in updates && (!updates.phone || typeof updates.phone !== "string" || !(updates.phone as string).trim())) {
      return NextResponse.json({ error: "Le téléphone ne peut pas être vide" }, { status: 422 });
    }

    const [before] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    if (!before) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }

    const [after] = await db.update(patients).set(updates).where(eq(patients.id, id)).returning();

    const beforeSnapshot: Record<string, unknown> = {};
    const afterSnapshot: Record<string, unknown> = {};
    for (const k of Object.keys(updates)) {
      beforeSnapshot[k] = (before as Record<string, unknown>)[k];
      afterSnapshot[k] = (after as Record<string, unknown>)[k];
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "patients.update",
      resourceType: "patients",
      resourceId: id,
      before: beforeSnapshot,
      after: afterSnapshot,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, patient: after });
  } catch (e) {
    console.error("[PATCH /api//admin/patients/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
