import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [totals, byPlatform, byVersion, byEvent, daily] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*) AS total_events,
             COUNT(DISTINCT patient_id) AS unique_users,
             COUNT(*) FILTER (WHERE event = 'app_open') AS app_opens
      FROM mobile_analytics WHERE created_at >= ${since}
    `),
    db.execute(sql`
      SELECT platform, COUNT(*) AS count, COUNT(DISTINCT patient_id) AS users
      FROM mobile_analytics WHERE created_at >= ${since}
      GROUP BY platform ORDER BY count DESC
    `),
    db.execute(sql`
      SELECT app_version, platform, COUNT(*) AS count, COUNT(DISTINCT patient_id) AS users
      FROM mobile_analytics WHERE created_at >= ${since} AND app_version IS NOT NULL
      GROUP BY app_version, platform ORDER BY count DESC LIMIT 20
    `),
    db.execute(sql`
      SELECT event, COUNT(*) AS count
      FROM mobile_analytics WHERE created_at >= ${since}
      GROUP BY event ORDER BY count DESC
    `),
    db.execute(sql`
      SELECT DATE(created_at) AS day, COUNT(*) AS events, COUNT(DISTINCT patient_id) AS users
      FROM mobile_analytics WHERE created_at >= ${since}
      GROUP BY DATE(created_at) ORDER BY day
    `),
  ]);

  return NextResponse.json({
    totals: (totals as unknown as any[])[0],
    byPlatform: byPlatform as unknown as any[],
    byVersion: byVersion as unknown as any[],
    byEvent: byEvent as unknown as any[],
    daily: daily as unknown as any[],
  });
}
