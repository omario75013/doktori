import { NextResponse } from "next/server";
import { db, subscriptionPlans } from "@doktori/db";
import { eq } from "drizzle-orm";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_TARGETS = new Set(["doctor", "clinic", "lab", "all"]);
const PATCH_FIELDS = [
  "label",
  "priceMillimes",
  "billingCycle",
  "features",
  "enabledFeatures",
  "maxAppointmentsPerMonth",
  "maxSmsPerMonth",
  "maxPatientsTotal",
  "targetType",
  "description",
  "extraRules",
  "displayOrder",
  "isActive",
] as const;

export const PATCH = withAdminAudit<{ ok: true }, RouteContext>({
  action: "plans.update",
  resourceType: "subscription_plans",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const k of PATCH_FIELDS) {
      if (k in b) updates[k] = b[k];
    }
    if ("targetType" in updates && typeof updates.targetType === "string" && !ALLOWED_TARGETS.has(updates.targetType)) {
      return NextResponse.json({ error: "targetType invalide" }, { status: 400 });
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun champ à modifier" }, { status: 400 });
    }
    const [exists] = await tx
      .select({ id: subscriptionPlans.id })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, resourceId))
      .limit(1);
    if (!exists) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }
    await tx.update(subscriptionPlans).set(updates).where(eq(subscriptionPlans.id, resourceId));
    return { ok: true } as const;
  },
});

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "plans.delete",
  resourceType: "subscription_plans",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId }) => {
    const [exists] = await tx
      .select({ id: subscriptionPlans.id })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, resourceId))
      .limit(1);
    if (!exists) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }
    await tx.delete(subscriptionPlans).where(eq(subscriptionPlans.id, resourceId));
    return { ok: true } as const;
  },
});
