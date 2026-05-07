import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, subscriptions } from "@doktori/db";
import { eq, and } from "drizzle-orm";

type Action = "activate" | "cancel" | "extend";

type PremiumBody = {
  plan?: string;
  action: Action;
  months?: number;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [row] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.doctorId, id), eq(subscriptions.status, "active")))
    .limit(1);

  return NextResponse.json({ subscription: row ?? null });
}

export const POST = withAdminAudit<
  { ok: true; subscription: typeof subscriptions.$inferSelect | undefined },
  RouteContext
>({
  action: ({ body }) => {
    const b = body as PremiumBody | null;
    return `doctors.premium_${b?.action ?? "unknown"}`;
  },
  resourceType: "subscriptions",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(subscriptions)
      .where(
        and(eq(subscriptions.doctorId, resourceId), eq(subscriptions.status, "active"))
      )
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as PremiumBody;
    const { plan = "premium", action, months } = b;

    if (!["activate", "cancel", "extend"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const [before] = await tx
      .select()
      .from(subscriptions)
      .where(
        and(eq(subscriptions.doctorId, resourceId), eq(subscriptions.status, "active"))
      )
      .limit(1);

    const now = new Date();
    let after: typeof before | undefined;

    if (action === "activate") {
      const durationMonths = months ?? 12;
      const endsAt = new Date(now);
      endsAt.setMonth(endsAt.getMonth() + durationMonths);

      if (before) {
        const [updated] = await tx
          .update(subscriptions)
          .set({
            plan,
            status: "active",
            startsAt: now,
            endsAt,
            cancelledAt: null,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, before.id))
          .returning();
        after = updated;
      } else {
        const [created] = await tx
          .insert(subscriptions)
          .values({
            doctorId: resourceId,
            plan,
            status: "active",
            priceMillimes: 0,
            billingCycle: "annual",
            paymentProvider: "manual",
            startsAt: now,
            endsAt,
          })
          .returning();
        after = created;
      }
    } else if (action === "cancel") {
      if (!before) {
        return NextResponse.json(
          { error: "Aucun abonnement actif à annuler" },
          { status: 404 }
        );
      }
      const [updated] = await tx
        .update(subscriptions)
        .set({
          status: "cancelled",
          endsAt: now,
          cancelledAt: now,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, before.id))
        .returning();
      after = updated;
    } else {
      // extend
      if (!before) {
        return NextResponse.json(
          { error: "Aucun abonnement actif à prolonger" },
          { status: 404 }
        );
      }
      const extensionMonths = months ?? 1;
      const baseDate = before.endsAt && before.endsAt > now ? before.endsAt : now;
      const newEndsAt = new Date(baseDate);
      newEndsAt.setMonth(newEndsAt.getMonth() + extensionMonths);

      const [updated] = await tx
        .update(subscriptions)
        .set({
          endsAt: newEndsAt,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, before.id))
        .returning();
      after = updated;
    }

    return { ok: true, subscription: after } as const;
  },
});
