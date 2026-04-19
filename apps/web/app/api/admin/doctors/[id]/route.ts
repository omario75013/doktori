import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

const ALLOWED_FIELDS = [
  "name",
  "email",
  "phone",
  "specialty",
  "city",
  "address",
  "bio",
  "consultationFee",
  "yearsOfExperience",
  "photoUrl",
  "isActive",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [row] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }
  return NextResponse.json({ doctor: row });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) updates[field] = body[field as AllowedField];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    const [before] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    if (!before) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    updates.updatedAt = new Date();
    const [after] = await db
      .update(doctors)
      .set(updates)
      .where(eq(doctors.id, id))
      .returning();

    const beforeSnapshot: Record<string, unknown> = {};
    const afterSnapshot: Record<string, unknown> = {};
    for (const k of Object.keys(updates)) {
      if (k === "updatedAt") continue;
      beforeSnapshot[k] = (before as Record<string, unknown>)[k];
      afterSnapshot[k] = (after as Record<string, unknown>)[k];
    }

    let action = "doctors.update";
    if ("isActive" in body && Object.keys(updates).length === 2) {
      action = body.isActive ? "doctors.activate" : "doctors.deactivate";
    }

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action,
      resourceType: "doctors",
      resourceId: id,
      before: beforeSnapshot,
      after: afterSnapshot,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, doctor: after });
  } catch (e) {
    console.error("[PATCH /api//admin/doctors/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const [before] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    if (!before) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    await db.delete(doctors).where(eq(doctors.id, id));

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "doctors.delete",
      resourceType: "doctors",
      resourceId: id,
      before: {
        name: before.name,
        email: before.email,
        specialty: before.specialty,
        city: before.city,
        isActive: before.isActive,
      },
      after: null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api//admin/doctors/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
