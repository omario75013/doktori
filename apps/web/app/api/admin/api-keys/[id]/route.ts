import { NextResponse } from "next/server";
import { apiKeys } from "@doktori/db";
import { eq } from "drizzle-orm";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/admin/api-keys/[id]
 *
 * Revoke an API key (set active=false, revokedAt=now). Soft revoke — we keep
 * the row for audit/log lineage.
 */
export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "api_keys.revoke",
  resourceType: "api_key",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { active: row.active, name: row.name, prefix: row.prefix };
  },
  handler: async ({ tx, resourceId }) => {
    if (!/^[0-9a-f-]{36}$/i.test(resourceId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const [existing] = await tx
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
    }

    if (!existing.active && existing.revokedAt) {
      return NextResponse.json({ error: "Clé déjà révoquée" }, { status: 409 });
    }

    await tx
      .update(apiKeys)
      .set({ active: false, revokedAt: new Date() })
      .where(eq(apiKeys.id, resourceId));

    return { ok: true } as const;
  },
});
