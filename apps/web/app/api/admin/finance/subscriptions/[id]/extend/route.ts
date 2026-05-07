import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { subscriptions } from "@doktori/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  {
    ok: true;
    subscription: { id: string; endsAt: Date | null; status: string } | undefined;
  },
  RouteContext
>({
  action: "subscription.extend",
  resourceType: "subscriptions",
  allowedRoles: ["super_admin", "finance"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({ status: subscriptions.status, endsAt: subscriptions.endsAt })
      .from(subscriptions)
      .where(eq(subscriptions.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { status: row.status, endsAt: row.endsAt?.toISOString() ?? null };
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as { months?: unknown };

    const months =
      typeof b.months === "number" && Number.isInteger(b.months) && b.months > 0
        ? b.months
        : null;

    if (!months) {
      return NextResponse.json(
        { error: "Le champ months doit être un entier positif." },
        { status: 422 }
      );
    }

    const [before] = await tx
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        endsAt: subscriptions.endsAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, resourceId))
      .limit(1);

    if (!before) {
      return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
    }
    if (before.status === "cancelled") {
      return NextResponse.json(
        { error: "Impossible d'étendre un abonnement annulé." },
        { status: 409 }
      );
    }

    const baseDate = before.endsAt ?? new Date();
    const newEndsAt = new Date(baseDate);
    newEndsAt.setMonth(newEndsAt.getMonth() + months);

    const newStatus = before.status === "expired" ? "active" : before.status;

    const [updated] = await tx
      .update(subscriptions)
      .set({
        endsAt: newEndsAt,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, resourceId))
      .returning({
        id: subscriptions.id,
        endsAt: subscriptions.endsAt,
        status: subscriptions.status,
      });

    return { ok: true, subscription: updated } as const;
  },
});
