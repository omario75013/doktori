import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { webhooks } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAudit<
  { webhook: typeof webhooks.$inferSelect },
  RouteContext
>({
  action: "webhooks.update",
  resourceType: "webhooks",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(webhooks).where(eq(webhooks.id, resourceId)).limit(1);
    if (!row) return null;
    return { isActive: row.isActive, url: row.url, events: row.events };
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as { isActive?: boolean; url?: string; events?: string[] };

    const [existing] = await tx.select().from(webhooks).where(eq(webhooks.id, resourceId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });
    }

    const updates: Partial<typeof webhooks.$inferInsert> = {};
    if (typeof b.isActive === "boolean") updates.isActive = b.isActive;
    if (b.url) {
      try {
        new URL(b.url);
        updates.url = b.url;
      } catch {
        return NextResponse.json({ error: "URL invalide" }, { status: 400 });
      }
    }
    if (Array.isArray(b.events)) updates.events = b.events;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    const [updated] = await tx
      .update(webhooks)
      .set(updates)
      .where(eq(webhooks.id, resourceId))
      .returning();

    return { webhook: updated };
  },
});

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "webhooks.delete",
  resourceType: "webhooks",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(webhooks).where(eq(webhooks.id, resourceId)).limit(1);
    if (!row) return null;
    return { url: row.url, events: row.events };
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });
    }

    await tx.delete(webhooks).where(eq(webhooks.id, resourceId));

    return { ok: true } as const;
  },
});
