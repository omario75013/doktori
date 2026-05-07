import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { catalogCities } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/admin/catalog/cities/[id] — update a city
export const PATCH = withAdminAudit<
  { city: typeof catalogCities.$inferSelect },
  RouteContext
>({
  action: "update",
  resourceType: "catalog_city",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(catalogCities)
      .where(eq(catalogCities.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(catalogCities)
      .where(eq(catalogCities.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Ville introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const updates: Partial<typeof catalogCities.$inferInsert> = {};

    if (typeof b.label === "string" && b.label.trim()) updates.label = b.label.trim();
    if (b.labelAr !== undefined)
      updates.labelAr = (b.labelAr as string | null)?.trim() ?? null;
    if (b.latitude !== undefined)
      updates.latitude = (b.latitude as string | null)?.trim() ?? null;
    if (b.longitude !== undefined)
      updates.longitude = (b.longitude as string | null)?.trim() ?? null;
    if (typeof b.isActive === "boolean") updates.isActive = b.isActive;
    if (typeof b.displayOrder === "number") updates.displayOrder = b.displayOrder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });
    }

    const [updated] = await tx
      .update(catalogCities)
      .set(updates)
      .where(eq(catalogCities.id, resourceId))
      .returning();

    return { city: updated };
  },
});

// DELETE /api/admin/catalog/cities/[id] — delete a city
export const DELETE = withAdminAudit<{ deleted: true }, RouteContext>({
  action: "delete",
  resourceType: "catalog_city",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(catalogCities)
      .where(eq(catalogCities.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select()
      .from(catalogCities)
      .where(eq(catalogCities.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Ville introuvable" }, { status: 404 });
    }

    await tx.delete(catalogCities).where(eq(catalogCities.id, resourceId));

    return { deleted: true } as const;
  },
});
