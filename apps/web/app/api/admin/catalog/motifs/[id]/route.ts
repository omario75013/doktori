import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, catalogMotifs } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/catalog/motifs/[id]
export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(catalogMotifs)
    .where(eq(catalogMotifs.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ motif: row });
}

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullish(),
  specialtyId: z.string().max(50).nullish(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  suggestedFee: z.number().int().min(0).nullish(),
  category: z.enum(["consultation", "controle", "urgence", "teleconsultation", "domicile", "autre"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const PATCH = withAdminAudit<unknown, RouteContext>({
  action: "catalog.motifs.update",
  resourceType: "catalog_motifs",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(catalogMotifs)
      .where(eq(catalogMotifs.id, resourceId))
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
      .update(catalogMotifs)
      .set(updates)
      .where(eq(catalogMotifs.id, resourceId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return { motif: updated };
  },
});

export const DELETE = withAdminAudit<unknown, RouteContext>({
  action: "catalog.motifs.delete",
  resourceType: "catalog_motifs",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(catalogMotifs)
      .where(eq(catalogMotifs.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select()
      .from(catalogMotifs)
      .where(eq(catalogMotifs.id, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    await tx.delete(catalogMotifs).where(eq(catalogMotifs.id, resourceId));
    return { deleted: true };
  },
});
