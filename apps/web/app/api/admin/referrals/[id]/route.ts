import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { withAdminAudit, type DbTx } from "@/lib/admin-audit-wrapper";
import { referrals, subscriptions, platformSettings } from "@doktori/db";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAudit<
  {
    referral: Omit<typeof referrals.$inferSelect, "createdAt" | "validatedAt"> & {
      createdAt: string;
      validatedAt: string | null;
    };
  },
  RouteContext
>({
  action: ({ body }) => {
    const b = body as { status?: unknown } | null;
    return `referrals.${b?.status ?? "unknown"}`;
  },
  resourceType: "referrals",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(referrals)
      .where(eq(referrals.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { status: row.status };
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx
      .select()
      .from(referrals)
      .where(eq(referrals.id, resourceId))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Parrainage introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const { status } = b;

    if (typeof status !== "string" || !["validated", "rewarded"].includes(status)) {
      return NextResponse.json(
        { error: "status doit être 'validated' ou 'rewarded'" },
        { status: 400 }
      );
    }

    if (status === "validated" && existing.status !== "pending") {
      return NextResponse.json(
        { error: "Seuls les parrainages en attente peuvent être validés" },
        { status: 409 }
      );
    }
    if (status === "rewarded" && existing.status !== "validated") {
      return NextResponse.json(
        { error: "Seuls les parrainages validés peuvent être récompensés" },
        { status: 409 }
      );
    }

    const updates: Partial<typeof referrals.$inferInsert> = { status };
    if (status === "validated") {
      updates.validatedAt = new Date();
    }

    if (status === "rewarded") {
      const settingsRows = await tx
        .select({ key: platformSettings.key, value: platformSettings.value })
        .from(platformSettings)
        .where(
          sql`${platformSettings.key} IN ('referral.reward_value', 'referral.referee_reward_value')`
        );

      const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));
      const referrerMonths = parseInt(settingsMap["referral.reward_value"] ?? "1", 10) || 1;
      const refereeMonths =
        parseInt(settingsMap["referral.referee_reward_value"] ?? "1", 10) || 1;

      async function extendOrCreate(
        innerTx: DbTx,
        doctorId: string,
        months: number,
        refLabel: string
      ) {
        const now = new Date();
        const [activeSub] = await innerTx
          .select({ id: subscriptions.id, endsAt: subscriptions.endsAt })
          .from(subscriptions)
          .where(
            and(eq(subscriptions.doctorId, doctorId), eq(subscriptions.status, "active"))
          )
          .limit(1);

        if (activeSub) {
          const baseDate = activeSub.endsAt ?? now;
          const newEndsAt = new Date(baseDate);
          newEndsAt.setMonth(newEndsAt.getMonth() + months);
          await innerTx
            .update(subscriptions)
            .set({ endsAt: newEndsAt, updatedAt: now })
            .where(eq(subscriptions.id, activeSub.id));
        } else {
          const endsAt = new Date(now);
          endsAt.setMonth(endsAt.getMonth() + months);
          await innerTx.insert(subscriptions).values({
            doctorId,
            plan: "essentiel",
            status: "active",
            priceMillimes: 0,
            billingCycle: "monthly",
            paymentProvider: "manual",
            externalRef: refLabel,
            startsAt: now,
            endsAt,
          });
        }
      }

      await extendOrCreate(tx, existing.referrerId, referrerMonths, `referral-referrer-${resourceId}`);
      await extendOrCreate(tx, existing.referredId, refereeMonths, `referral-referee-${resourceId}`);
    }

    const [updated] = await tx
      .update(referrals)
      .set(updates)
      .where(eq(referrals.id, resourceId))
      .returning();

    return {
      referral: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        validatedAt: updated.validatedAt ? updated.validatedAt.toISOString() : null,
      },
    };
  },
});
