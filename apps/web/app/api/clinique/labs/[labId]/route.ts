import { NextRequest, NextResponse } from "next/server";
import { db, labs } from "@doktori/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ labId: string }> };

// ── PATCH /api/clinique/labs/[id] ───────────────────────────────────────────
// Update name, services, phone, address, city of an in-house lab.

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { labId: id } = await ctx.params;

  // Verify ownership
  const [existing] = await db
    .select({ id: labs.id, clinicId: labs.clinicId })
    .from(labs)
    .where(and(eq(labs.id, id), isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)));

  if (!existing) {
    return NextResponse.json({ error: "Labo introuvable ou accès refusé" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const updateFields: Partial<{
    name: string;
    phone: string;
    address: string;
    city: string;
    services: string[];
  }> = {};

  if (typeof body.name === "string" && body.name.trim()) updateFields.name = body.name.trim();
  if (typeof body.phone === "string") updateFields.phone = body.phone.trim();
  if (typeof body.address === "string") updateFields.address = body.address.trim();
  if (typeof body.city === "string") updateFields.city = body.city.trim();
  if (Array.isArray(body.services)) updateFields.services = body.services as string[];

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  await db.update(labs).set(updateFields).where(eq(labs.id, id));

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "lab_update",
    targetType: "lab",
    targetId: id,
    metadata: updateFields,
  });

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/clinique/labs/[id] ──────────────────────────────────────────
// Soft-delete: set verification_status='disabled'.

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { labId: id } = await ctx.params;

  // Verify ownership
  const [existing] = await db
    .select({ id: labs.id, name: labs.name, clinicId: labs.clinicId })
    .from(labs)
    .where(and(eq(labs.id, id), isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)));

  if (!existing) {
    return NextResponse.json({ error: "Labo introuvable ou accès refusé" }, { status: 404 });
  }

  // Soft-delete: mark disabled
  await db
    .update(labs)
    .set({ verificationStatus: "disabled" })
    .where(eq(labs.id, id));

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "lab_delete",
    targetType: "lab",
    targetId: id,
    metadata: { name: existing.name },
  });

  return NextResponse.json({ ok: true });
}
