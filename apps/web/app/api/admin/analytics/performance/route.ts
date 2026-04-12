import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin([]);
  if (admin instanceof NextResponse) return admin;

  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.specialty,
      d.city,
      d.consultation_fee,
      COUNT(a.id)::int                                                     AS bookings,
      COUNT(a.id) FILTER (WHERE a.status = 'cancelled')::int               AS cancelled,
      COUNT(a.id) FILTER (WHERE a.status = 'no_show')::int                 AS no_shows,
      ROUND(AVG(r.rating)::numeric, 1)                                     AS avg_rating,
      COUNT(r.id)::int                                                     AS review_count
    FROM doctors d
    LEFT JOIN appointments a
      ON a.doctor_id = d.id AND a.created_at >= ${since}
    LEFT JOIN reviews r
      ON r.doctor_id = d.id AND r.status = 'published'
    GROUP BY d.id, d.name, d.specialty, d.city, d.consultation_fee
    HAVING COUNT(a.id) > 0
    ORDER BY bookings DESC
    LIMIT 100
  `);

  const scorecards = (rows as unknown as Array<{
    id: string;
    name: string;
    specialty: string;
    city: string;
    consultation_fee: number | null;
    bookings: number;
    cancelled: number;
    no_shows: number;
    avg_rating: string | null;
    review_count: number;
  }>).map((r) => {
    const bookings = Number(r.bookings);
    const cancelled = Number(r.cancelled);
    const noShows = Number(r.no_shows);
    const fee = Number(r.consultation_fee ?? 0);

    return {
      id: r.id,
      name: r.name,
      specialty: r.specialty,
      city: r.city,
      bookings,
      cancellationRate: bookings > 0 ? Math.round((cancelled / bookings) * 100) : 0,
      noShowRate: bookings > 0 ? Math.round((noShows / bookings) * 100) : 0,
      avgRating: r.avg_rating ? Number(r.avg_rating) : null,
      reviewCount: Number(r.review_count),
      // Revenue estimate: bookings × consultationFee (millimes → DT)
      revenueEstimate: Math.round((bookings * fee) / 1000),
    };
  });

  return NextResponse.json({ scorecards });
}
