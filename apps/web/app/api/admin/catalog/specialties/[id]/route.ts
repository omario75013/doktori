import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { catalogSpecialties } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/admin/catalog/specialties/[id] — update a specialty
export const PATCH = withAdminAudit<
  { specialty: typeof catalogSpecialties.$inferSelect },
  RouteContext
>({
  action: "update",
  resourceType: "catalog_specialty",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(catalogSpecialties)
      .where(eq(catalogSpecialties.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(catalogSpecialties)
      .where(eq(catalogSpecialties.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Spécialité introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const updates: Partial<typeof catalogSpecialties.$inferInsert> = {};

    if (typeof b.label === "string" && b.label.trim()) updates.label = b.label.trim();
    if (b.labelAr !== undefined)
      updates.labelAr = (b.labelAr as string | null)?.trim() ?? null;
    if (b.icon !== undefined)
      updates.icon = (b.icon as string | null)?.trim() ?? null;
    if (typeof b.isActive === "boolean") updates.isActive = b.isActive;
    if (typeof b.displayOrder === "number") updates.displayOrder = b.displayOrder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });
    }

    const [updated] = await tx
      .update(catalogSpecialties)
      .set(updates)
      .where(eq(catalogSpecialties.id, resourceId))
      .returning();

    return { specialty: updated };
  },
});

// DELETE /api/admin/catalog/specialties/[id] — delete a specialty
export const DELETE = withAdminAudit<{ deleted: true }, RouteContext>({
  action: "delete",
  resourceType: "catalog_specialty",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(catalogSpecialties)
      .where(eq(catalogSpecialties.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select()
      .from(catalogSpecialties)
      .where(eq(catalogSpecialties.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Spécialité introuvable" }, { status: 404 });
    }

    await tx.delete(catalogSpecialties).where(eq(catalogSpecialties.id, resourceId));

    return { deleted: true } as const;
  },
});
