import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const [doctorCountsResult, sessionsByCityResult] = await Promise.all([
    // Available SOS doctors per city
    db.execute(sql`
      SELECT d.city, COUNT(*)::int AS count
      FROM doctors d
      JOIN doctor_home_visit_settings dhvs ON dhvs.doctor_id = d.id
      WHERE dhvs.is_available = true AND d.is_active = true AND d.city IS NOT NULL
      GROUP BY d.city
      ORDER BY count DESC
    `),

    // Session stats per city (city derived from accepted doctor's city)
    db.execute(sql`
      SELECT
        COALESCE(d.city, 'inconnue') AS city,
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE s.status = 'expired')::int AS expired_count,
        COUNT(*) FILTER (WHERE s.status IN ('accepted','completed'))::int AS accepted_count
      FROM sos_sessions s
      LEFT JOIN doctors d ON d.id = s.doctor_id
      WHERE s.requested_at >= NOW() - INTERVAL '30 days'
      GROUP BY d.city
      ORDER BY total_requests DESC
    `),
  ]);

  const doctorCounts = doctorCountsResult as unknown as { city: string; count: number }[];
  const doctorCountMap = new Map(doctorCounts.map((r) => [r.city, r.count]));

  const sessionsByCity = sessionsByCityResult as unknown as {
    city: string;
    total_requests: number;
    expired_count: number;
    accepted_count: number;
  }[];

  // Cities with no SOS-available doctors at all
  const citiesWithSessions = new Set(sessionsByCity.map((r) => r.city));
  const noDoctorCities = Array.from(citiesWithSessions).filter(
    (city) => !doctorCountMap.has(city)
  );

  // Cities where more than 50% of sessions expired
  const lowAcceptanceCities = sessionsByCity
    .filter((r) => r.total_requests >= 3 && r.expired_count / r.total_requests > 0.5)
    .map((r) => ({
      city: r.city,
      totalRequests: r.total_requests,
      expiredCount: r.expired_count,
      expiredPct: Math.round((r.expired_count / r.total_requests) * 100),
      availableDoctors: doctorCountMap.get(r.city) ?? 0,
    }));

  const citiesTable = sessionsByCity.map((r) => ({
    city: r.city,
    totalRequests: r.total_requests,
    expiredCount: r.expired_count,
    expiredPct: r.total_requests > 0 ? Math.round((r.expired_count / r.total_requests) * 100) : 0,
    acceptedCount: r.accepted_count,
    availableDoctors: doctorCountMap.get(r.city) ?? 0,
  }));

  return NextResponse.json({
    noDoctorCities,
    lowAcceptanceCities,
    doctorCounts,
    citiesTable,
  });
}
