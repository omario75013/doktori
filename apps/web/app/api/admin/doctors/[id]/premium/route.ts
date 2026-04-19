import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, subscriptions } from "@doktori/db";
import { eq, and } from "drizzle-orm";

type Action = "activate" | "cancel" | "extend";

type PremiumBody = {
  plan?: string;
  action: Action;
  months?: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = (await req.json()) as PremiumBody;
    const { plan = "premium", action, months } = body;

    if (!["activate", "cancel", "extend"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    // Fetch current active subscription (before snapshot)
    const [before] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.doctorId, id), eq(subscriptions.status, "active")))
      .limit(1);

    const now = new Date();
    let after: typeof before | undefined;
    const meta = extractRequestMeta(req);

    if (action === "activate") {
      const durationMonths = months ?? 12;
      const endsAt = new Date(now);
      endsAt.setMonth(endsAt.getMonth() + durationMonths);

      if (before) {
        // Update existing active subscription
        const [updated] = await db
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
        // Create new subscription — priceMillimes defaults to 0 (manual/admin-granted)
        const [created] = await db
          .insert(subscriptions)
          .values({
            doctorId: id,
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
      const [updated] = await db
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

      const [updated] = await db
        .update(subscriptions)
        .set({
          endsAt: newEndsAt,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, before.id))
        .returning();
      after = updated;
    }

    await logAudit({
      actor: admin,
      action: `doctors.premium_${action}`,
      resourceType: "subscriptions",
      resourceId: id,
      before: before ?? null,
      after: after ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, subscription: after });
  } catch (e) {
    console.error("[POST /api//admin/doctors/[id]/premium]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
