import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, meilisearchSynonyms } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(meilisearchSynonyms)
    .where(eq(meilisearchSynonyms.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ synonym: row });
}

const patchSchema = z.object({
  term: z.string().min(1).max(100).optional(),
  synonyms: z.array(z.string().min(1).max(100)).min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAdminAudit<unknown, RouteContext>({
  action: "catalog.synonymes.update",
  resourceType: "meilisearch_synonyms",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(meilisearchSynonyms)
      .where(eq(meilisearchSynonyms.id, resourceId))
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
    const updateValues: Partial<typeof meilisearchSynonyms.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (updates.term !== undefined) updateValues.term = updates.term.trim().toLowerCase();
    if (updates.synonyms !== undefined)
      updateValues.synonyms = updates.synonyms.map((s) => s.trim().toLowerCase());
    if (updates.isActive !== undefined) updateValues.isActive = updates.isActive;

    const [updated] = await tx
      .update(meilisearchSynonyms)
      .set(updateValues)
      .where(eq(meilisearchSynonyms.id, resourceId))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    return { synonym: updated };
  },
});

export const DELETE = withAdminAudit<unknown, RouteContext>({
  action: "catalog.synonymes.delete",
  resourceType: "meilisearch_synonyms",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(meilisearchSynonyms)
      .where(eq(meilisearchSynonyms.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select()
      .from(meilisearchSynonyms)
      .where(eq(meilisearchSynonyms.id, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    await tx.delete(meilisearchSynonyms).where(eq(meilisearchSynonyms.id, resourceId));
    return { deleted: true };
  },
});
