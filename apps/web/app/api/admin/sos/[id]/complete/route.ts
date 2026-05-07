import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<{ ok: true }, RouteContext>({
  action: "sos.admin_complete",
  resourceType: "sos_sessions",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId }) => {
    const result = await tx.execute(sql`
      UPDATE sos_sessions
      SET
        status       = 'completed',
        completed_at = NOW(),
        resolution   = 'completed'
      WHERE id = ${resourceId} AND status = 'accepted'
      RETURNING id
    `);

    const updated = (result as unknown as Array<{ id: string }>)[0];
    if (!updated) {
      return NextResponse.json(
        { error: "Session non acceptée ou introuvable" },
        { status: 409 }
      );
    }

    return { ok: true } as const;
  },
});
