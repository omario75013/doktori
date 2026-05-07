import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, insuranceProviders } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/catalog/insurance/[id]
export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(insuranceProviders)
    .where(eq(insuranceProviders.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ provider: row });
}

// PATCH /api/admin/catalog/insurance/[id]
const patchSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  labelAr: z.string().max(100).nullish(),
  type: z.enum(["public", "private"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const PATCH = withAdminAudit<unknown, RouteContext>({
  action: "catalog.insurance.update",
  resourceType: "insurance_providers",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(insuranceProviders)
      .where(eq(insuranceProviders.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
    }
    const [updated] = await tx
      .update(insuranceProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(insuranceProviders.id, resourceId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return { provider: updated };
  },
});

// DELETE /api/admin/catalog/insurance/[id]
export const DELETE = withAdminAudit<unknown, RouteContext>({
  action: "catalog.insurance.delete",
  resourceType: "insurance_providers",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(insuranceProviders)
      .where(eq(insuranceProviders.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select()
      .from(insuranceProviders)
      .where(eq(insuranceProviders.id, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    await tx.delete(insuranceProviders).where(eq(insuranceProviders.id, resourceId));
    return { deleted: true };
  },
});
