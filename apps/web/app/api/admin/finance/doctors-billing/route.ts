import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ALLOWED_PLANS = new Set(["free", "essentiel", "pro", "clinique"]);
const ALLOWED_STATUSES = new Set(["trial", "active", "expired", "cancelled"]);

/**
 * GET /api/admin/finance/doctors-billing
 * Returns paginated list of doctors with billing details for admin management.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  const planRaw = searchParams.get("plan");
  const statusRaw = searchParams.get("status");
  const searchRaw = searchParams.get("search") ?? "";

  const planFilter = planRaw && ALLOWED_PLANS.has(planRaw) ? planRaw : null;
  const statusFilter = statusRaw && ALLOWED_STATUSES.has(statusRaw) ? statusRaw : null;
  // Sanitize search: only allow alphanumeric, spaces, hyphens
  const search = searchRaw.replace(/[^a-zA-Z0-9\s\-àâäéèêëïîôöùûüç]/g, "").trim();

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.email,
      d.is_active,
      s.id AS subscription_id,
      s.plan,
      s.status AS subscription_status,
      s.ends_at AS trial_end_date,
      s.price_millimes,
      COUNT(DISTINCT a.id)::int AS total_consultations,
      COALESCE(SUM(CASE WHEN wt.amount > 0 THEN wt.amount ELSE 0 END), 0)::bigint AS total_revenue,
      COALESCE(SUM(CASE WHEN wt.type = 'commission' AND wt.amount > 0 THEN wt.amount ELSE 0 END), 0)::bigint AS total_commission
    FROM doctors d
    LEFT JOIN subscriptions s ON s.doctor_id = d.id AND s.status IN ('active', 'pending', 'expired')
    LEFT JOIN appointments a ON a.doctor_id = d.id AND a.status = 'completed'
    LEFT JOIN wallet_transactions wt ON wt.doctor_id = d.id
    WHERE (${planFilter}::text IS NULL OR s.plan = ${planFilter})
      AND (${statusFilter}::text IS NULL OR s.status = ${statusFilter})
      AND (${search} = '' OR d.name ILIKE ${'%' + search + '%'} OR d.email ILIKE ${'%' + search + '%'})
    GROUP BY d.id, d.name, d.email, d.is_active, s.id, s.plan, s.status, s.ends_at, s.price_millimes
    ORDER BY total_commission DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const [countRow] = await db.execute(sql`
    SELECT COUNT(DISTINCT d.id)::int AS total
    FROM doctors d
    LEFT JOIN subscriptions s ON s.doctor_id = d.id AND s.status IN ('active', 'pending', 'expired')
    WHERE (${planFilter}::text IS NULL OR s.plan = ${planFilter})
      AND (${statusFilter}::text IS NULL OR s.status = ${statusFilter})
      AND (${search} = '' OR d.name ILIKE ${'%' + search + '%'} OR d.email ILIKE ${'%' + search + '%'})
  `);

  const total = Number((countRow as Record<string, unknown>).total ?? 0);

  return NextResponse.json({ doctors: rows, total, page, limit });
}
