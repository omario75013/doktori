import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, catalogCities } from "@doktori/db";
import { eq } from "drizzle-orm";

// PATCH /api/admin/catalog/cities/[id] — update a city
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(catalogCities)
    .where(eq(catalogCities.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Ville introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Partial<typeof catalogCities.$inferInsert> = {};

  if (typeof body.label === "string" && body.label.trim()) updates.label = body.label.trim();
  if (body.labelAr !== undefined) updates.labelAr = body.labelAr?.trim() ?? null;
  if (body.latitude !== undefined) updates.latitude = body.latitude?.trim() ?? null;
  if (body.longitude !== undefined) updates.longitude = body.longitude?.trim() ?? null;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  if (typeof body.displayOrder === "number") updates.displayOrder = body.displayOrder;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });
  }

  const [updated] = await db
    .update(catalogCities)
    .set(updates)
    .where(eq(catalogCities.id, id))
    .returning();

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "update",
    resourceType: "catalog_city",
    resourceId: id,
    before: existing,
    after: updated,
    ip,
    userAgent,
  });

  return NextResponse.json({ city: updated });
}

// DELETE /api/admin/catalog/cities/[id] — delete a city
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(catalogCities)
    .where(eq(catalogCities.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Ville introuvable" }, { status: 404 });
  }

  await db.delete(catalogCities).where(eq(catalogCities.id, id));

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "delete",
    resourceType: "catalog_city",
    resourceId: id,
    before: existing,
    ip,
    userAgent,
  });

  return NextResponse.json({ deleted: true });
}
