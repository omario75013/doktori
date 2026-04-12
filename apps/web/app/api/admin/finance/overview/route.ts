import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const [overview] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'active') AS active_subscriptions,
      (SELECT COALESCE(SUM(price_millimes), 0)::bigint FROM subscriptions WHERE status = 'active') AS mrr_millimes,
      (SELECT COUNT(*)::int FROM subscriptions
        WHERE status = 'active'
          AND created_at >= date_trunc('month', NOW())
      ) AS new_this_month,
      (SELECT COUNT(*)::int FROM subscriptions
        WHERE status = 'cancelled'
          AND cancelled_at >= date_trunc('month', NOW())
      ) AS churned_this_month
  `);

  return NextResponse.json(overview);
}
