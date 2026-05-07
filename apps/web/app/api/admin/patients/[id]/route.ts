import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
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

export const PATCH = withAdminAudit<
  { ok: true; patient: typeof patients.$inferSelect },
  RouteContext
>({
  action: "patients.update",
  resourceType: "patients",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(patients).where(eq(patients.id, resourceId)).limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in b) updates[field as AllowedField] = b[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    if ("name" in updates && (!updates.name || typeof updates.name !== "string" || !(updates.name as string).trim())) {
      return NextResponse.json({ error: "Le nom ne peut pas être vide" }, { status: 422 });
    }
    if ("phone" in updates && (!updates.phone || typeof updates.phone !== "string" || !(updates.phone as string).trim())) {
      return NextResponse.json({ error: "Le téléphone ne peut pas être vide" }, { status: 422 });
    }

    const [before] = await tx.select().from(patients).where(eq(patients.id, resourceId)).limit(1);
    if (!before) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }

    const [after] = await tx
      .update(patients)
      .set(updates)
      .where(eq(patients.id, resourceId))
      .returning();

    return { ok: true, patient: after } as const;
  },
});
