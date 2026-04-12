import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, referrals, subscriptions } from "@doktori/db";

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

  // When rewarded: extend the referrer's active subscription by 1 month
  // or create a 1-month premium subscription if none exists
  if (status === "rewarded") {
    const [activeSub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.doctorId, existing.referrerId),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1);

    if (activeSub) {
      await db.execute(sql`
        UPDATE subscriptions
        SET ends_at = ends_at + INTERVAL '1 month',
            updated_at = now()
        WHERE id = ${activeSub.id}
      `);
    } else {
      const now = new Date();
      const endsAt = new Date(now);
      endsAt.setMonth(endsAt.getMonth() + 1);
      await db.insert(subscriptions).values({
        doctorId: existing.referrerId,
        plan: "premium",
        status: "active",
        priceMillimes: 0,
        billingCycle: "monthly",
        paymentProvider: "manual",
        externalRef: `referral-reward-${id}`,
        startsAt: now,
        endsAt,
      });
    }
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
