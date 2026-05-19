import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  db,
  actorSubscriptions,
  subscriptionPlans,
  subscriptions,
} from "@doktori/db";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

const ACTOR_TYPES = new Set(["doctor", "clinic", "lab"]);
type RouteContext = { params: Promise<{ type: string; id: string }> };

// Returns the current plan (if any) and the catalog of plans matching the actor.
export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { type, id } = await ctx.params;
  if (!ACTOR_TYPES.has(type)) {
    return NextResponse.json({ error: "type invalide" }, { status: 400 });
  }

  const [current] = await db
    .select()
    .from(actorSubscriptions)
    .where(and(eq(actorSubscriptions.actorType, type), eq(actorSubscriptions.actorId, id)))
    .limit(1);

  const plans = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true));

  // Filter to plans matching this actor (targetType === actor type or 'all').
  const applicable = plans.filter(
    (p) => p.targetType === type || p.targetType === "all",
  );

  return NextResponse.json({
    current: current
      ? {
          planCode: current.planCode,
          status: current.status,
          currentPeriodStart: current.currentPeriodStart,
          currentPeriodEnd: current.currentPeriodEnd,
          notes: current.notes,
        }
      : null,
    plans: applicable.map((p) => ({
      code: p.code,
      label: p.label,
      priceMillimes: p.priceMillimes,
      billingCycle: p.billingCycle,
      enabledFeatures: p.enabledFeatures ?? [],
      maxAppointmentsPerMonth: p.maxAppointmentsPerMonth,
      maxSmsPerMonth: p.maxSmsPerMonth,
      maxPatientsTotal: p.maxPatientsTotal,
    })),
  });
}

// PUT — upsert the assignment. Body: { planCode, status?, currentPeriodEnd?, notes? }
// For doctor target, mirrors to the legacy `subscriptions` table so plan-gates.ts still works.
export const PUT = withAdminAudit<{ ok: true }, RouteContext>({
  action: "subscriptions.assign",
  resourceType: "actor_subscriptions",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => {
    const { type, id } = await ctx.params;
    return `${type}:${id}`;
  },
  getBefore: async ({ tx, ctx }) => {
    const { type, id } = await ctx.params;
    const [row] = await tx
      .select()
      .from(actorSubscriptions)
      .where(and(eq(actorSubscriptions.actorType, type), eq(actorSubscriptions.actorId, id)))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, ctx, body, admin }) => {
    const { type, id } = await ctx.params;
    if (!ACTOR_TYPES.has(type)) {
      return NextResponse.json({ error: "type invalide" }, { status: 400 });
    }
    const b = (body ?? {}) as {
      planCode?: string;
      status?: string;
      currentPeriodEnd?: string | null;
      notes?: string | null;
    };
    if (!b.planCode) {
      return NextResponse.json({ error: "planCode requis" }, { status: 400 });
    }
    const [plan] = await tx
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, b.planCode))
      .limit(1);
    if (!plan) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }
    if (plan.targetType !== type && plan.targetType !== "all") {
      return NextResponse.json(
        { error: "Ce plan ne s'applique pas à ce type d'utilisateur" },
        { status: 400 },
      );
    }

    const periodEnd = b.currentPeriodEnd ? new Date(b.currentPeriodEnd) : null;
    const status = b.status ?? "active";

    const [existing] = await tx
      .select({ id: actorSubscriptions.id })
      .from(actorSubscriptions)
      .where(and(eq(actorSubscriptions.actorType, type), eq(actorSubscriptions.actorId, id)))
      .limit(1);

    if (existing) {
      await tx
        .update(actorSubscriptions)
        .set({
          planCode: b.planCode,
          status,
          currentPeriodEnd: periodEnd,
          notes: b.notes ?? null,
          assignedByAdminId: admin.id,
          updatedAt: new Date(),
        })
        .where(eq(actorSubscriptions.id, existing.id));
    } else {
      await tx.insert(actorSubscriptions).values({
        actorType: type,
        actorId: id,
        planCode: b.planCode,
        status,
        currentPeriodEnd: periodEnd,
        notes: b.notes ?? null,
        assignedByAdminId: admin.id,
      });
    }

    // Mirror to legacy `subscriptions` table for doctors so plan-gates.ts
    // (which queries `subscriptions` only) keeps working.
    if (type === "doctor") {
      const [legacy] = await tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.doctorId, id))
        .limit(1);
      if (legacy) {
        await tx
          .update(subscriptions)
          .set({ plan: b.planCode, status, updatedAt: new Date() })
          .where(eq(subscriptions.id, legacy.id));
      } else {
        await tx.insert(subscriptions).values({
          doctorId: id,
          plan: b.planCode,
          status,
          priceMillimes: plan.priceMillimes,
          billingCycle: plan.billingCycle,
        });
      }
    }

    return { ok: true } as const;
  },
});

// DELETE — remove the assignment (revert to "no plan" / free).
export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "subscriptions.unassign",
  resourceType: "actor_subscriptions",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => {
    const { type, id } = await ctx.params;
    return `${type}:${id}`;
  },
  handler: async ({ tx, ctx }) => {
    const { type, id } = await ctx.params;
    if (!ACTOR_TYPES.has(type)) {
      return NextResponse.json({ error: "type invalide" }, { status: 400 });
    }
    await tx
      .delete(actorSubscriptions)
      .where(and(eq(actorSubscriptions.actorType, type), eq(actorSubscriptions.actorId, id)));
    if (type === "doctor") {
      await tx.delete(subscriptions).where(eq(subscriptions.doctorId, id));
    }
    return { ok: true } as const;
  },
});
