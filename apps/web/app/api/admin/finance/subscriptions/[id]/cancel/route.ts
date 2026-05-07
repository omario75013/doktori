import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  { ok: true; subscription: Record<string, unknown> | undefined },
  RouteContext
>({
  action: "subscription.cancel",
  resourceType: "subscriptions",
  allowedRoles: ["super_admin", "finance"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId }) => {
    const beforeResult = await tx.execute(sql`
      SELECT id, status FROM subscriptions WHERE id = ${resourceId} LIMIT 1
    `);
    const before = (beforeResult as unknown as Record<string, unknown>[])[0];
    if (!before) {
      return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
    }
    if (before.status === "cancelled") {
      return NextResponse.json({ error: "Abonnement déjà annulé." }, { status: 409 });
    }

    const updateResult = await tx.execute(sql`
      UPDATE subscriptions
      SET
        status       = 'cancelled',
        cancelled_at = NOW(),
        updated_at   = NOW()
      WHERE id = ${resourceId}
      RETURNING id, status, cancelled_at
    `);

    const updated = (updateResult as unknown as Record<string, unknown>[])[0];

    return { ok: true, subscription: updated } as const;
  },
});
