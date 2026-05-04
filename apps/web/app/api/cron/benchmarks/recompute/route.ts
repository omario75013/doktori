import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Recompute the doctor_benchmark_snapshots cache.
 *
 * For each active doctor we compute:
 *   - no_show_rate    : count(no_show) / count(all) over last 90 days
 *   - avg_rating      : avg(reviews.rating) where status='published'
 *   - total_appointments_30d : count(appointments) last 30 days
 *
 * Then we rank each doctor inside its (specialty, city) cohort:
 *   - no_show_rank_specialty       : ascending no_show_rate (lower = better)
 *   - rating_rank_specialty        : descending avg_rating (higher = better)
 *   - appointments_rank_specialty  : descending appointments_30d
 *   - no_show_total_specialty      : cohort size
 *
 * Single SQL pass using window functions; upserts everything in one statement.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const startedAt = Date.now();

  // CTE-based upsert.
  // 1. raw   : per-doctor metrics over the relevant windows
  // 2. ranked: rank within (specialty, city) cohort
  // 3. INSERT…ON CONFLICT: upsert on doctor_id PK
  const result = await db.execute(sql`
    WITH raw AS (
      SELECT
        d.id              AS doctor_id,
        d.specialty       AS specialty,
        d.city            AS city,
        COALESCE(
          NULLIF(
            (
              SELECT COUNT(*) FILTER (WHERE a.status = 'no_show')::numeric
                / NULLIF(COUNT(*)::numeric, 0)
              FROM appointments a
              WHERE a.doctor_id = d.id
                AND a.starts_at >= NOW() - INTERVAL '90 days'
                AND a.status IN ('completed', 'no_show', 'confirmed', 'cancelled')
            ),
            NULL
          ) * 100,
          0
        )::numeric(5,2) AS no_show_rate,
        COALESCE(
          (SELECT AVG(r.rating)::numeric(3,2)
           FROM reviews r
           WHERE r.doctor_id = d.id
             AND r.status = 'published'),
          0
        ) AS avg_rating,
        (
          SELECT COUNT(*)::int
          FROM appointments a
          WHERE a.doctor_id = d.id
            AND a.starts_at >= NOW() - INTERVAL '30 days'
        ) AS total_appointments_30d
      FROM doctors d
      WHERE d.is_active = true
    ),
    ranked AS (
      SELECT
        doctor_id,
        specialty,
        city,
        no_show_rate,
        avg_rating,
        total_appointments_30d,
        RANK() OVER (PARTITION BY specialty, city ORDER BY no_show_rate ASC, doctor_id)         AS no_show_rank_specialty,
        RANK() OVER (PARTITION BY specialty, city ORDER BY avg_rating DESC, doctor_id)          AS rating_rank_specialty,
        RANK() OVER (PARTITION BY specialty, city ORDER BY total_appointments_30d DESC, doctor_id) AS appointments_rank_specialty,
        COUNT(*) OVER (PARTITION BY specialty, city)                                            AS cohort_size
      FROM raw
    )
    INSERT INTO doctor_benchmark_snapshots (
      doctor_id, specialty, city,
      no_show_rate, no_show_rank_specialty, no_show_total_specialty,
      avg_rating, rating_rank_specialty,
      total_appointments_30d, appointments_rank_specialty,
      computed_at
    )
    SELECT
      doctor_id, specialty, city,
      no_show_rate, no_show_rank_specialty, cohort_size,
      avg_rating, rating_rank_specialty,
      total_appointments_30d, appointments_rank_specialty,
      NOW()
    FROM ranked
    ON CONFLICT (doctor_id) DO UPDATE SET
      specialty                  = EXCLUDED.specialty,
      city                       = EXCLUDED.city,
      no_show_rate               = EXCLUDED.no_show_rate,
      no_show_rank_specialty     = EXCLUDED.no_show_rank_specialty,
      no_show_total_specialty    = EXCLUDED.no_show_total_specialty,
      avg_rating                 = EXCLUDED.avg_rating,
      rating_rank_specialty      = EXCLUDED.rating_rank_specialty,
      total_appointments_30d     = EXCLUDED.total_appointments_30d,
      appointments_rank_specialty = EXCLUDED.appointments_rank_specialty,
      computed_at                = NOW()
  `);

  const rows = (result as unknown as { rowCount?: number }).rowCount ?? null;

  return NextResponse.json({
    ok: true,
    rows,
    durationMs: Date.now() - startedAt,
    at: new Date().toISOString(),
  });
}

// Allow GET as well so Vercel cron schedule can hit it without method tweaks
export async function GET(req: Request) {
  return POST(req);
}
