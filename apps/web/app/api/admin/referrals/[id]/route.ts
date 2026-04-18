import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, referrals, subscriptions, platformSettings } from "@doktori/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [existing] = await db.select().from(referrals).where(eq(referrals.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Parrainage introuvable" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const { status } = body;

  if (typeof status !== "string" || !["validated", "rewarded"].includes(status)) {
    return NextResponse.json({ error: "status doit être 'validated' ou 'rewarded'" }, { status: 400 });
  }

  // Guard invalid transitions
  if (status === "validated" && existing.status !== "pending") {
    return NextResponse.json({ error: "Seuls les parrainages en attente peuvent être validés" }, { status: 409 });
  }
  if (status === "rewarded" && existing.status !== "validated") {
    return NextResponse.json({ error: "Seuls les parrainages validés peuvent être récompensés" }, { status: 409 });
  }

  const updates: Partial<typeof referrals.$inferInsert> = { status };
  if (status === "validated") {
    updates.validatedAt = new Date();
  }

  // When rewarded: extend referrer AND referee subscriptions based on platform_settings
  if (status === "rewarded") {
    // Read configurable reward values from platform_settings
    const settingsRows = await db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(
        sql`${platformSettings.key} IN ('referral.reward_value', 'referral.referee_reward_value')`
      );

    const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));
    const referrerMonths = parseInt(settingsMap["referral.reward_value"] ?? "1", 10) || 1;
    const refereeMonths = parseInt(settingsMap["referral.referee_reward_value"] ?? "1", 10) || 1;

    // Helper to extend or create subscription for a doctor
    async function extendOrCreate(doctorId: string, months: number, refLabel: string) {
      const now = new Date();
      const [activeSub] = await db
        .select({ id: subscriptions.id, endsAt: subscriptions.endsAt })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.doctorId, doctorId),
            eq(subscriptions.status, "active"),
          ),
        )
        .limit(1);

      if (activeSub) {
        const baseDate = activeSub.endsAt ?? now;
        const newEndsAt = new Date(baseDate);
        newEndsAt.setMonth(newEndsAt.getMonth() + months);
        await db
          .update(subscriptions)
          .set({ endsAt: newEndsAt, updatedAt: now })
          .where(eq(subscriptions.id, activeSub.id));
      } else {
        const endsAt = new Date(now);
        endsAt.setMonth(endsAt.getMonth() + months);
        await db.insert(subscriptions).values({
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

    // Reward referrer
    await extendOrCreate(existing.referrerId, referrerMonths, `referral-referrer-${id}`);
    // Reward referee (new doctor)
    await extendOrCreate(existing.referredId, refereeMonths, `referral-referee-${id}`);
  }

  const [updated] = await db
    .update(referrals)
    .set(updates)
    .where(eq(referrals.id, id))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: `referrals.${status}`,
    resourceType: "referrals",
    resourceId: id,
    before: { status: existing.status },
    after: { status: updated.status, validatedAt: updated.validatedAt?.toISOString() ?? null },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({
    referral: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      validatedAt: updated.validatedAt ? updated.validatedAt.toISOString() : null,
    },
  });
}
