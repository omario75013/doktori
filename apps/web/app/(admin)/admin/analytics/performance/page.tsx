import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { ScorecardTable } from "./scorecard-table";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const admin = await requireAdmin([]);
  if (!admin || admin instanceof Response) redirect("/admin-login");

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

  const scorecards = (
    rows as unknown as Array<{
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
    }>
  ).map((r) => {
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
      revenueEstimate: Math.round((bookings * fee) / 1000),
    };
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Scorecard médecins</h1>
          <p className="text-slate-500 mt-1">
            Performance individuelle — 30 derniers jours · {scorecards.length} médecin
            {scorecards.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Bon (&lt; seuil)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          Modéré (annul. ≥20% / no-show ≥10%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Élevé (annul. ≥40% / no-show ≥25%)
        </span>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <ScorecardTable scorecards={scorecards} />
      </div>
    </div>
  );
}
