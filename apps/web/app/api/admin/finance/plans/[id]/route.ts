import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, subscriptionPlans } from "@doktori/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  // Validate allowed fields
  const allowedFields = ["label", "priceMillimes", "features", "isActive", "displayOrder"];
  const updates: Partial<typeof subscriptionPlans.$inferInsert> = {};

  if ("label" in body) {
    if (typeof body.label !== "string" || !body.label.trim()) {
      return NextResponse.json({ error: "label invalide." }, { status: 422 });
    }
    updates.label = body.label.trim();
  }

  if ("priceMillimes" in body) {
    if (typeof body.priceMillimes !== "number" || body.priceMillimes < 0 || !Number.isInteger(body.priceMillimes)) {
      return NextResponse.json({ error: "priceMillimes doit être un entier >= 0." }, { status: 422 });
    }
    updates.priceMillimes = body.priceMillimes;
  }

  if ("features" in body) {
    if (!Array.isArray(body.features) || !body.features.every((f) => typeof f === "string")) {
      return NextResponse.json({ error: "features doit être un tableau de chaînes." }, { status: 422 });
    }
    updates.features = body.features as string[];
  }

  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive doit être un booléen." }, { status: 422 });
    }
    updates.isActive = body.isActive;
  }

  if ("displayOrder" in body) {
    if (typeof body.displayOrder !== "number" || !Number.isInteger(body.displayOrder)) {
      return NextResponse.json({ error: "displayOrder doit être un entier." }, { status: 422 });
    }
    updates.displayOrder = body.displayOrder;
  }

  // Ignore unknown fields
  const unknownKeys = Object.keys(body).filter((k) => !allowedFields.includes(k));
  if (unknownKeys.length > 0 && Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ modifiable fourni." }, { status: 422 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ modifiable fourni." }, { status: 422 });
  }

  const [updated] = await db
    .update(subscriptionPlans)
    .set(updates)
    .where(eq(subscriptionPlans.id, id))
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "subscription_plan.update",
    resourceType: "subscription_plans",
    resourceId: id,
    before: existing,
    after: updated,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ plan: updated });
}
