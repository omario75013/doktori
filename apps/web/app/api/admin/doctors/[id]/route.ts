import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
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

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action:
      typeof body.isActive === "boolean"
        ? body.isActive
          ? "doctors.activate"
          : "doctors.deactivate"
        : "doctors.update",
    resourceType: "doctors",
    resourceId: id,
    before: { isActive: before.isActive },
    after: { isActive: after.isActive },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
