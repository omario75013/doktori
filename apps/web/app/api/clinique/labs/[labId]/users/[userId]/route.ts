import { NextRequest, NextResponse } from "next/server";
import { db, labs, labUsers } from "@doktori/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ labId: string; userId: string }> };

// ── PATCH /api/clinique/labs/[labId]/users/[userId] ─────────────────────────
// Toggle is_active or update name/role.
// Body: { isActive?, firstName?, lastName?, role? }

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { labId, userId } = await ctx.params;

  // Verify lab belongs to this clinic
  const [lab] = await db
    .select({ id: labs.id })
    .from(labs)
    .where(and(eq(labs.id, labId), isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)));

  if (!lab) {
    return NextResponse.json({ error: "Labo introuvable ou accès refusé" }, { status: 404 });
  }

  // Verify user belongs to this lab
  const [existing] = await db
    .select({ id: labUsers.id })
    .from(labUsers)
    .where(and(eq(labUsers.id, userId), eq(labUsers.labId, labId)));

  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const updateFields: Partial<{
    isActive: boolean;
    firstName: string;
    lastName: string;
    role: string;
    updatedAt: Date;
  }> = {};

  if (typeof body.isActive === "boolean") updateFields.isActive = body.isActive;
  if (typeof body.firstName === "string" && body.firstName.trim()) {
    updateFields.firstName = body.firstName.trim();
  }
  if (typeof body.lastName === "string" && body.lastName.trim()) {
    updateFields.lastName = body.lastName.trim();
  }
  if (body.role === "admin" || body.role === "technician") {
    updateFields.role = body.role;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  updateFields.updatedAt = new Date();
  await db.update(labUsers).set(updateFields).where(eq(labUsers.id, userId));

  const action = "isActive" in updateFields && Object.keys(updateFields).length <= 2
    ? "lab_user_toggle"
    : "lab_user_update";

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action,
    targetType: "lab_user",
    targetId: userId,
    metadata: { labId, ...updateFields, updatedAt: undefined },
  });

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/clinique/labs/[labId]/users/[userId] ────────────────────────
// Hard-delete the lab user.

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { labId, userId } = await ctx.params;

  // Verify lab belongs to this clinic
  const [lab] = await db
    .select({ id: labs.id })
    .from(labs)
    .where(and(eq(labs.id, labId), isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)));

  if (!lab) {
    return NextResponse.json({ error: "Labo introuvable ou accès refusé" }, { status: 404 });
  }

  // Verify user belongs to this lab
  const [existing] = await db
    .select({ id: labUsers.id, email: labUsers.email })
    .from(labUsers)
    .where(and(eq(labUsers.id, userId), eq(labUsers.labId, labId)));

  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  await db.delete(labUsers).where(eq(labUsers.id, userId));

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "lab_user_delete",
    targetType: "lab_user",
    targetId: userId,
    metadata: { labId, email: existing.email },
  });

  return NextResponse.json({ ok: true });
}
