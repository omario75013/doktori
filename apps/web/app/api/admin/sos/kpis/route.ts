import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);

  // Default: last 30 days
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromParam = searchParams.get("from") ?? defaultFrom.toISOString();
  const toParam = searchParams.get("to") ?? now.toISOString();

  const [
    ratesResult,
    declineReasonsResult,
    bySymptomResult,
    byHourResult,
  ] = await Promise.all([
    // Acceptance rate, median response time, median distance, completion rate
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('accepted','completed'))::float /
          NULLIF(COUNT(*), 0) AS acceptance_rate,
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (accepted_at - requested_at)) * 1000
        ) FILTER (WHERE accepted_at IS NOT NULL) AS median_response_ms,
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY distance_m
        ) FILTER (WHERE distance_m IS NOT NULL) AS median_distance_m,
        COUNT(*) FILTER (WHERE status = 'completed')::float /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted','completed')), 0) AS completion_rate
      FROM sos_sessions
      WHERE requested_at BETWEEN ${fromParam} AND ${toParam}
    `),

    // Top decline reasons
    db.execute(sql`
      SELECT reason, COUNT(*)::int AS count
      FROM sos_declines sd
      JOIN sos_sessions s ON s.id = sd.sos_session_id
      WHERE s.requested_at BETWEEN ${fromParam} AND ${toParam}
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 20
    `),

    // By symptom category
    db.execute(sql`
      SELECT
        COALESCE(symptom_category, 'non_précisé') AS category,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE status IN ('accepted','completed'))::int AS accepted_count
      FROM sos_sessions
      WHERE requested_at BETWEEN ${fromParam} AND ${toParam}
      GROUP BY symptom_category
      ORDER BY count DESC
    `),

    // By hour of day
    db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM requested_at AT TIME ZONE 'Africa/Tunis')::int AS hour,
        COUNT(*)::int AS count
      FROM sos_sessions
      WHERE requested_at BETWEEN ${fromParam} AND ${toParam}
      GROUP BY hour
      ORDER BY hour
    `),
  ]);

  const rates = (ratesResult as unknown as Record<string, number | null>[])[0] ?? {};

  return NextResponse.json({
    acceptanceRate: rates.acceptance_rate ?? 0,
    medianResponseTimeMs: rates.median_response_ms ?? null,
    medianDistanceM: rates.median_distance_m ?? null,
    completionRate: rates.completion_rate ?? 0,
    declineReasons: declineReasonsResult as unknown as { reason: string; count: number }[],
    bySymptom: bySymptomResult as unknown as { category: string; count: number; acceptedCount: number }[],
    byHour: byHourResult as unknown as { hour: number; count: number }[],
  });
}
