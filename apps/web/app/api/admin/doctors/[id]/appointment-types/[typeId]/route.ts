import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, appointmentTypes } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; typeId: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id, typeId } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const [before] = await db
    .select()
    .from(appointmentTypes)
    .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
    .limit(1);

  if (!before) {
    return NextResponse.json(
      { error: "Type de consultation introuvable" },
      { status: 404 }
    );
  }

  const ALLOWED_FIELDS = [
    "name",
    "durationMinutes",
    "fee",
    "color",
    "isActive",
    "isDefault",
  ] as const;
  type AllowedField = (typeof ALLOWED_FIELDS)[number];

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updates[field] = body[field as AllowedField];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  if (
    "name" in updates &&
    (typeof updates.name !== "string" || (updates.name as string).trim().length === 0)
  ) {
    return NextResponse.json({ error: "name invalide" }, { status: 400 });
  }
  if (
    "durationMinutes" in updates &&
    (typeof updates.durationMinutes !== "number" ||
      !Number.isInteger(updates.durationMinutes) ||
      (updates.durationMinutes as number) <= 0)
  ) {
    return NextResponse.json(
      { error: "durationMinutes doit être un entier positif" },
      { status: 400 }
    );
  }

  if ("name" in updates) {
    updates.name = (updates.name as string).trim();
  }

  const [after] = await db
    .update(appointmentTypes)
    .set(updates)
    .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
    .returning();

  const beforeSnapshot: Record<string, unknown> = {};
  const afterSnapshot: Record<string, unknown> = {};
  for (const k of Object.keys(updates)) {
    beforeSnapshot[k] = (before as Record<string, unknown>)[k];
    afterSnapshot[k] = (after as Record<string, unknown>)[k];
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "appointment_types.update",
    resourceType: "appointment_types",
    resourceId: typeId,
    before: beforeSnapshot,
    after: afterSnapshot,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true, appointmentType: after });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; typeId: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id, typeId } = await params;
  const [before] = await db
    .select()
    .from(appointmentTypes)
    .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
    .limit(1);

  if (!before) {
    return NextResponse.json(
      { error: "Type de consultation introuvable" },
      { status: 404 }
    );
  }

  // Soft-delete: set isActive=false to avoid FK issues with existing appointments
  await db
    .update(appointmentTypes)
    .set({ isActive: false })
    .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)));

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "appointment_types.deactivate",
    resourceType: "appointment_types",
    resourceId: typeId,
    before: {
      name: before.name,
      durationMinutes: before.durationMinutes,
      fee: before.fee,
      isActive: before.isActive,
    },
    after: { isActive: false },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
