import { NextRequest, NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * GET /api/doctor/dashboard-charts?range=30|90|365
 *
 * Aggregates per-bucket data used by the dashboard charts:
 *   - appointments — count of confirmed/completed RDV per bucket
 *   - income — sum of paid appointments per bucket
 *   - cancellationRate — % of cancelled RDV per bucket
 *
 * Bucket granularity adapts to the range:
 *   30 days  → day buckets (30 points)
 *   90 days  → week buckets (~13 points)
 *   365 days → month buckets (12 points)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = session.user.id;
  const rangeParam = new URL(req.url).searchParams.get("range");
  const rangeDays = rangeParam === "365" ? 365 : rangeParam === "90" ? 90 : 30;

  const granularity = rangeDays === 365 ? "month" : rangeDays === 90 ? "week" : "day";

  // We use date_trunc on starts_at and compute totals + cancellations.
  const rows = await db.execute<{
    bucket: string;
    total: string;
    completed: string;
    cancelled: string;
    income: string;
  }>(sql`
    SELECT
      to_char(date_trunc(${granularity}, starts_at), 'YYYY-MM-DD') AS bucket,
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status IN ('completed', 'confirmed'))::text AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
      COALESCE(SUM(price) FILTER (WHERE status IN ('completed', 'confirmed') AND paid = true), 0)::text AS income
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND starts_at >= NOW() - (${rangeDays} || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  // recharts expects an array of plain objects
  const points = (rows as unknown as Array<{
    bucket: string;
    total: string;
    completed: string;
    cancelled: string;
    income: string;
  }>).map((r) => ({
    bucket: r.bucket,
    total: Number(r.total),
    completed: Number(r.completed),
    cancelled: Number(r.cancelled),
    income: Number(r.income) / 1000, // store in millimes → convert to DT
    cancellationRate:
      Number(r.total) > 0
        ? Math.round((Number(r.cancelled) / Number(r.total)) * 100)
        : 0,
  }));

  return NextResponse.json({ rangeDays, granularity, points });
}
