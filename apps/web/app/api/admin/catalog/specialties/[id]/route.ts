import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, catalogSpecialties } from "@doktori/db";
import { eq } from "drizzle-orm";

// PATCH /api/admin/catalog/specialties/[id] — update a specialty
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(catalogSpecialties)
      .where(eq(catalogSpecialties.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Spécialité introuvable" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: Partial<typeof catalogSpecialties.$inferInsert> = {};

    if (typeof body.label === "string" && body.label.trim()) updates.label = body.label.trim();
    if (body.labelAr !== undefined) updates.labelAr = body.labelAr?.trim() ?? null;
    if (body.icon !== undefined) updates.icon = body.icon?.trim() ?? null;
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    if (typeof body.displayOrder === "number") updates.displayOrder = body.displayOrder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });
    }

    const [updated] = await db
      .update(catalogSpecialties)
      .set(updates)
      .where(eq(catalogSpecialties.id, id))
      .returning();

    const { ip, userAgent } = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "update",
      resourceType: "catalog_specialty",
      resourceId: id,
      before: existing,
      after: updated,
      ip,
      userAgent,
    });

    return NextResponse.json({ specialty: updated });
  } catch (e) {
    console.error("[PATCH /api//admin/catalog/specialties/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/admin/catalog/specialties/[id] — delete a specialty
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(catalogSpecialties)
      .where(eq(catalogSpecialties.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Spécialité introuvable" }, { status: 404 });
    }

    await db.delete(catalogSpecialties).where(eq(catalogSpecialties.id, id));

    const { ip, userAgent } = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "delete",
      resourceType: "catalog_specialty",
      resourceId: id,
      before: existing,
      ip,
      userAgent,
    });

    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error("[DELETE /api//admin/catalog/specialties/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
