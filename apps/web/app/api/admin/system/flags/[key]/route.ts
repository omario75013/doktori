import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { featureFlags } from "@doktori/db";
import { eq, sql } from "drizzle-orm";

type RouteContext = { params: Promise<{ key: string }> };

// PATCH /api/admin/system/flags/[key] — toggle or update a feature flag
export const PATCH = withAdminAudit<
  { flag: typeof featureFlags.$inferSelect },
  RouteContext
>({
  action: "update",
  resourceType: "feature_flag",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).key,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Flag introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const updates: Partial<typeof featureFlags.$inferInsert> = {};

    if (typeof b.enabled === "boolean") updates.enabled = b.enabled;
    if (b.description !== undefined) updates.description = b.description as string | null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });
    }

    const [updated] = await tx
      .update(featureFlags)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(featureFlags.key, resourceId))
      .returning();

    return { flag: updated };
  },
});
