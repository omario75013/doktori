import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { subscriptionPlans } from "@doktori/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAudit<
  { plan: typeof subscriptionPlans.$inferSelect },
  RouteContext
>({
  action: "subscription_plan.update",
  resourceType: "subscription_plans",
  allowedRoles: ["super_admin", "finance"],
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
    const [existing] = await tx
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as Record<string, unknown>;

    const allowedFields = [
      "label",
      "priceMillimes",
      "features",
      "isActive",
      "displayOrder",
      "maxAppointmentsPerMonth",
      "maxSmsPerMonth",
      "maxPatientsTotal",
      "enabledFeatures",
    ];
    const updates: Partial<typeof subscriptionPlans.$inferInsert> = {};

    if ("label" in b) {
      if (typeof b.label !== "string" || !b.label.trim()) {
        return NextResponse.json({ error: "label invalide." }, { status: 422 });
      }
      updates.label = b.label.trim();
    }

    if ("priceMillimes" in b) {
      if (
        typeof b.priceMillimes !== "number" ||
        b.priceMillimes < 0 ||
        !Number.isInteger(b.priceMillimes)
      ) {
        return NextResponse.json(
          { error: "priceMillimes doit être un entier >= 0." },
          { status: 422 }
        );
      }
      updates.priceMillimes = b.priceMillimes;
    }

    if ("features" in b) {
      if (!Array.isArray(b.features) || !b.features.every((f) => typeof f === "string")) {
        return NextResponse.json(
          { error: "features doit être un tableau de chaînes." },
          { status: 422 }
        );
      }
      updates.features = b.features as string[];
    }

    if ("isActive" in b) {
      if (typeof b.isActive !== "boolean") {
        return NextResponse.json({ error: "isActive doit être un booléen." }, { status: 422 });
      }
      updates.isActive = b.isActive;
    }

    if ("displayOrder" in b) {
      if (typeof b.displayOrder !== "number" || !Number.isInteger(b.displayOrder)) {
        return NextResponse.json({ error: "displayOrder doit être un entier." }, { status: 422 });
      }
      updates.displayOrder = b.displayOrder;
    }

    if ("maxAppointmentsPerMonth" in b) {
      updates.maxAppointmentsPerMonth =
        b.maxAppointmentsPerMonth === null ? null : Number(b.maxAppointmentsPerMonth);
    }
    if ("maxSmsPerMonth" in b) {
      updates.maxSmsPerMonth = b.maxSmsPerMonth === null ? null : Number(b.maxSmsPerMonth);
    }
    if ("maxPatientsTotal" in b) {
      updates.maxPatientsTotal =
        b.maxPatientsTotal === null ? null : Number(b.maxPatientsTotal);
    }
    if ("enabledFeatures" in b) {
      if (!Array.isArray(b.enabledFeatures)) {
        return NextResponse.json(
          { error: "enabledFeatures doit être un tableau." },
          { status: 422 }
        );
      }
      updates.enabledFeatures = b.enabledFeatures as string[];
    }

    const unknownKeys = Object.keys(b).filter((k) => !allowedFields.includes(k));
    if (unknownKeys.length > 0 && Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun champ modifiable fourni." }, { status: 422 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucun champ modifiable fourni." }, { status: 422 });
    }

    const [updated] = await tx
      .update(subscriptionPlans)
      .set(updates)
      .where(eq(subscriptionPlans.id, resourceId))
      .returning();

    return { plan: updated };
  },
});
