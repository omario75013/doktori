import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { secretaries } from "@doktori/db";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAudit<
  {
    secretary: Omit<typeof secretaries.$inferSelect, "createdAt"> & { createdAt: string };
  },
  RouteContext
>({
  action: ({ body }) => {
    const b = body as { isActive?: unknown } | null;
    return b?.isActive ? "secretaries.activate" : "secretaries.suspend";
  },
  resourceType: "secretaries",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({ isActive: secretaries.isActive })
      .from(secretaries)
      .where(eq(secretaries.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(secretaries)
      .where(eq(secretaries.id, resourceId))
      .limit(1);
    if (!existing)
      return NextResponse.json({ error: "Secrétaire introuvable" }, { status: 404 });

    const b = (body ?? {}) as Record<string, unknown>;

    if (typeof b.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive (boolean) requis" }, { status: 400 });
    }

    const [updated] = await tx
      .update(secretaries)
      .set({ isActive: b.isActive })
      .where(eq(secretaries.id, resourceId))
      .returning();

    return {
      secretary: { ...updated, createdAt: updated.createdAt.toISOString() },
    };
  },
});
