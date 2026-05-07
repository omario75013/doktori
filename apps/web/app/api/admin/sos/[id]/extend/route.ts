import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  { ok: true; expiresAt: string },
  RouteContext
>({
  action: "sos.extend_expiry",
  resourceType: "sos_sessions",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId }) => {
    const result = await tx.execute(sql`
      UPDATE sos_sessions
      SET expires_at = expires_at + INTERVAL '15 minutes'
      WHERE id = ${resourceId} AND status = 'pending'
      RETURNING id, expires_at
    `);

    const updated = (result as unknown as Array<{ id: string; expires_at: string }>)[0];
    if (!updated) {
      return NextResponse.json(
        { error: "Session non en attente ou introuvable" },
        { status: 409 }
      );
    }

    return { ok: true, expiresAt: updated.expires_at } as const;
  },
});
