import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, subscriptions, doctors } from "@doktori/db";
import { eq, and, desc, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_PLANS = new Set(["free", "essentiel", "pro", "clinique"]);
const ALLOWED_STATUSES = new Set(["pending", "active", "expired", "cancelled"]);

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  // Strict allowlist validation — unknown values are silently ignored (no filter applied)
  const planRaw = searchParams.get("plan");
  const statusRaw = searchParams.get("status");
  const planParam = planRaw && ALLOWED_PLANS.has(planRaw) ? planRaw : null;
  const statusParam = statusRaw && ALLOWED_STATUSES.has(statusRaw) ? statusRaw : null;

  const conditions = [
    planParam ? eq(subscriptions.plan, planParam) : undefined,
    statusParam ? eq(subscriptions.status, statusParam) : undefined,
  ].filter(Boolean) as Parameters<typeof and>;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        plan: subscriptions.plan,
        status: subscriptions.status,
        billing_cycle: subscriptions.billingCycle,
        price_millimes: subscriptions.priceMillimes,
        starts_at: subscriptions.startsAt,
        ends_at: subscriptions.endsAt,
        created_at: subscriptions.createdAt,
        doctor_name: doctors.name,
        doctor_email: doctors.email,
      })
      .from(subscriptions)
      .leftJoin(doctors, eq(subscriptions.doctorId, doctors.id))
      .where(whereClause)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(subscriptions)
      .where(whereClause),
  ]);

  const total = countRows[0]?.total ?? 0;

  // Serialize timestamps to ISO strings for safe JSON transport
  const subscriptionsList = rows.map((r) => ({
    ...r,
    starts_at: r.starts_at?.toISOString() ?? null,
    ends_at: r.ends_at?.toISOString() ?? null,
    created_at: r.created_at.toISOString(),
  }));

  return NextResponse.json({ subscriptions: subscriptionsList, total, page, limit });
}
