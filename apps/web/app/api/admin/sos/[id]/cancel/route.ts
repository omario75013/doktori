import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { sql } from "drizzle-orm";
import { closePhoneProxy } from "@/lib/phone-proxy";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<{ ok: true }, RouteContext>({
  action: "sos.admin_cancel",
  resourceType: "sos_sessions",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as { reason?: unknown } | null;
    return typeof b?.reason === "string" ? b.reason : null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as { reason?: string };
    const reason = b.reason ?? "Annulé par l'administration";

    const result = await tx.execute(sql`
      UPDATE sos_sessions
      SET
        status       = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = 'admin',
        cancel_reason = ${reason},
        resolution   = 'cancelled_by_admin'
      WHERE id = ${resourceId} AND status IN ('pending', 'accepted')
      RETURNING id, status AS old_status
    `);

    const updated = (result as unknown as Array<{ id: string; old_status: string }>)[0];
    if (!updated) {
      return NextResponse.json(
        { error: "Session non annulable (déjà terminée ou introuvable)" },
        { status: 409 }
      );
    }

    // Close phone proxy if one was active (best effort)
    try {
      await closePhoneProxy(resourceId);
    } catch (e) {
      console.error("[SOS-ADMIN-CANCEL] closePhoneProxy failed:", e);
    }

    return { ok: true } as const;
  },
});
