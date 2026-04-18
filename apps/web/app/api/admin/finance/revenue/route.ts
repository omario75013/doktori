import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/revenue
 * Returns commission revenue stats for the admin revenue dashboard.
 */
export async function GET() {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const [monthTotal] = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::bigint AS total_this_month
    FROM wallet_transactions
    WHERE type = 'commission'
      AND created_at >= date_trunc('month', NOW())
  `);

  const bySource = await db.execute(sql`
    SELECT
      CASE
        WHEN description ILIKE '%sos%' THEN 'SOS'
        WHEN description ILIKE '%téléconsult%' OR description ILIKE '%teleconsult%' THEN 'Téléconsultation'
        ELSE 'Autre'
      END AS source,
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::bigint AS total
    FROM wallet_transactions
    WHERE type = 'commission'
      AND created_at >= date_trunc('month', NOW())
    GROUP BY source
    ORDER BY total DESC
  `);

  const monthlyTrend = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::bigint AS total
    FROM wallet_transactions
    WHERE type = 'commission'
      AND created_at >= NOW() - interval '12 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at) ASC
  `);

  const subscriptionsByPlan = await db.execute(sql`
    SELECT
      plan,
      COUNT(*)::int AS count
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY plan
    ORDER BY count DESC
  `);

  const topDoctors = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.email,
      COUNT(DISTINCT a.id)::int AS total_consultations,
      COALESCE(SUM(CASE WHEN wt.amount > 0 THEN wt.amount ELSE 0 END), 0)::bigint AS total_revenue,
      COALESCE(SUM(CASE WHEN wt.type = 'commission' AND wt.amount > 0 THEN wt.amount ELSE 0 END), 0)::bigint AS total_commission
    FROM doctors d
    LEFT JOIN appointments a ON a.doctor_id = d.id AND a.status = 'completed'
    LEFT JOIN wallet_transactions wt ON wt.doctor_id = d.id
    GROUP BY d.id, d.name, d.email
    ORDER BY total_commission DESC
    LIMIT 10
  `);

  const [trialConversions] = await db.execute(sql`
    SELECT
      COUNT(*)::int AS converted_trials
    FROM subscriptions
    WHERE status = 'active'
      AND payment_provider IS NOT NULL
      AND created_at >= date_trunc('month', NOW())
  `);

  return NextResponse.json({
    total_this_month: Number((monthTotal as Record<string, unknown>).total_this_month ?? 0),
    by_source: bySource,
    monthly_trend: monthlyTrend,
    subscriptions_by_plan: subscriptionsByPlan,
    top_doctors: topDoctors,
    trial_conversions: Number((trialConversions as Record<string, unknown>).converted_trials ?? 0),
  });
}
