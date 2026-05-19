import { NextResponse, type NextRequest } from "next/server";
import { db, subscriptionPlans } from "@doktori/db";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const rows = await db
    .select()
    .from(subscriptionPlans)
    .orderBy(desc(subscriptionPlans.isActive), subscriptionPlans.displayOrder);
  return NextResponse.json({ plans: rows });
}

type CreateBody = {
  code?: string;
  label?: string;
  priceMillimes?: number;
  billingCycle?: string;
  features?: string[];
  enabledFeatures?: string[];
  maxAppointmentsPerMonth?: number | null;
  maxSmsPerMonth?: number | null;
  maxPatientsTotal?: number | null;
  targetType?: string;
  description?: string | null;
  extraRules?: Record<string, number | boolean | string>;
  displayOrder?: number;
  isActive?: boolean;
};

const ALLOWED_TARGETS = new Set(["doctor", "clinic", "lab", "all"]);

type RouteContext = { params: Promise<Record<string, never>> };

export const POST = withAdminAudit<{ ok: true; planId: string }, RouteContext>({
  action: "plans.create",
  resourceType: "subscription_plans",
  allowedRoles: ["super_admin"],
  getResourceId: () => "new",
  handler: async ({ tx, body }) => {
    const b = (body ?? {}) as CreateBody;
    if (!b.code || !b.label || typeof b.priceMillimes !== "number") {
      return NextResponse.json(
        { error: "code, label et priceMillimes requis" },
        { status: 400 },
      );
    }
    const target = b.targetType && ALLOWED_TARGETS.has(b.targetType) ? b.targetType : "doctor";
    const [row] = await tx
      .insert(subscriptionPlans)
      .values({
        code: b.code,
        label: b.label,
        priceMillimes: b.priceMillimes,
        billingCycle: b.billingCycle ?? "monthly",
        features: b.features ?? [],
        enabledFeatures: b.enabledFeatures ?? [],
        maxAppointmentsPerMonth: b.maxAppointmentsPerMonth ?? null,
        maxSmsPerMonth: b.maxSmsPerMonth ?? null,
        maxPatientsTotal: b.maxPatientsTotal ?? null,
        targetType: target,
        description: b.description ?? null,
        extraRules: b.extraRules ?? {},
        displayOrder: b.displayOrder ?? 0,
        isActive: b.isActive ?? true,
      })
      .returning({ id: subscriptionPlans.id });
    return { ok: true, planId: row.id } as const;
  },
});
