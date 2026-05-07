import { NextResponse } from "next/server";
import { retentionPolicies } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

const patchSchema = z
  .object({
    retentionDays: z.number().int().min(1).max(365 * 50).optional(),
    hardDelete: z.boolean().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ resourceType: string }> };

export const PATCH = withAdminAudit<
  {
    policy: Omit<typeof retentionPolicies.$inferSelect, "lastRunAt" | "updatedAt"> & {
      lastRunAt: string | null;
      updatedAt: string;
    };
  },
  RouteContext
>({
  action: "retention.update",
  resourceType: "retention_policies",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).resourceType,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.resourceType, resourceId))
      .limit(1);
    if (!row) return null;
    return { retentionDays: row.retentionDays, hardDelete: row.hardDelete };
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(retentionPolicies)
      .where(eq(retentionPolicies.resourceType, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Politique introuvable" }, { status: 404 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.retentionDays !== undefined) updates.retentionDays = parsed.data.retentionDays;
    if (parsed.data.hardDelete !== undefined) updates.hardDelete = parsed.data.hardDelete;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;

    const [updated] = await tx
      .update(retentionPolicies)
      .set(updates)
      .where(eq(retentionPolicies.resourceType, resourceId))
      .returning();

    return {
      policy: {
        ...updated,
        lastRunAt: updated.lastRunAt ? updated.lastRunAt.toISOString() : null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  },
});
