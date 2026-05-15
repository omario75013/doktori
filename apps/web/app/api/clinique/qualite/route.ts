import { type NextRequest, NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  reviews,
  clinicDoctors,
} from "@doktori/db";
import {
  eq,
  and,
  gte,
  lte,
  inArray,
  count,
  avg,
  sql,
} from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { toCsv, toXlsx, parseExportFormat } from "@/lib/exports";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DoctorQuality = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  avgRating: number | null;
  ratingCount: number;
  noShowRate: number;
  completionRate: number;
  cancelRate: number;
  totalRdv: number;
  satisfactionScore: null;
};

type MonthlyTrend = {
  month: string; // "YYYY-MM"
  avgRating: number | null;
  noShowRate: number;
  totalRdv: number;
};

// ---------------------------------------------------------------------------
// GET /api/clinique/qualite
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = req.nextUrl;
  const doctorIdFilter = searchParams.get("doctorId") ?? null;
  const fmt = parseExportFormat(req);

  // Date range — default last 90 days
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const rangeFrom = fromParam ? new Date(fromParam) : defaultFrom;
  const rangeTo = toParam ? new Date(toParam) : now;

  // ── Clinic doctors ──────────────────────────────────────────────────────
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  let allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);
  if (allDoctorIds.length === 0) {
    return NextResponse.json({ doctors: [], rangeFrom, rangeTo });
  }

  if (doctorIdFilter) {
    if (!allDoctorIds.includes(doctorIdFilter)) {
      return NextResponse.json({ error: "Médecin non trouvé" }, { status: 404 });
    }
    allDoctorIds = [doctorIdFilter];
  }

  // ── Doctor details ──────────────────────────────────────────────────────
  const doctorRows = await db
    .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(inArray(doctors.id, allDoctorIds));

  const doctorMap = new Map(doctorRows.map((d) => [d.id, d]));

  // ── Appointment aggregates ──────────────────────────────────────────────
  const apptAgg = await db
    .select({
      doctorId: appointments.doctorId,
      total: count(appointments.id),
      completed: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'completed')`,
      noShow: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'no_show')`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'cancelled')`,
    })
    .from(appointments)
    .where(
      and(
        inArray(appointments.doctorId, allDoctorIds),
        gte(appointments.startsAt, rangeFrom),
        lte(appointments.startsAt, rangeTo),
      ),
    )
    .groupBy(appointments.doctorId);

  const apptMap = new Map(apptAgg.map((r) => [r.doctorId, r]));

  // ── Review aggregates ───────────────────────────────────────────────────
  const reviewAgg = await db
    .select({
      doctorId: reviews.doctorId,
      avgRating: avg(reviews.rating),
      ratingCount: count(reviews.id),
    })
    .from(reviews)
    .where(
      and(
        inArray(reviews.doctorId, allDoctorIds),
        gte(reviews.createdAt, rangeFrom),
        lte(reviews.createdAt, rangeTo),
        eq(reviews.status, "published"),
      ),
    )
    .groupBy(reviews.doctorId);

  const reviewMap = new Map(reviewAgg.map((r) => [r.doctorId, r]));

  // ── Build per-doctor result ─────────────────────────────────────────────
  const doctorsList: DoctorQuality[] = allDoctorIds.map((doctorId) => {
    const doc = doctorMap.get(doctorId);
    const appt = apptMap.get(doctorId);
    const rev = reviewMap.get(doctorId);

    const total = Number(appt?.total ?? 0);
    const completed = Number(appt?.completed ?? 0);
    const noShow = Number(appt?.noShow ?? 0);
    const cancelled = Number(appt?.cancelled ?? 0);

    const rawAvg = rev?.avgRating != null ? Number(rev.avgRating) : null;

    return {
      doctorId,
      doctorName: doc?.name ?? "—",
      specialty: doc?.specialty ?? "—",
      avgRating: rawAvg !== null ? Math.round(rawAvg * 10) / 10 : null,
      ratingCount: Number(rev?.ratingCount ?? 0),
      totalRdv: total,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      cancelRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      satisfactionScore: null,
    };
  });

  // Sort by avgRating DESC, nulls last
  doctorsList.sort((a, b) => {
    if (a.avgRating === null && b.avgRating === null) return 0;
    if (a.avgRating === null) return 1;
    if (b.avgRating === null) return -1;
    return b.avgRating - a.avgRating;
  });

  // ── Export formats ──────────────────────────────────────────────────────
  if (fmt === "csv" || fmt === "xlsx") {
    type ExportRow = Record<string, unknown>;
    const exportRows: ExportRow[] = doctorsList.map((d) => ({ ...d }));
    const columns = [
      { key: "doctorName", header: "Médecin" },
      { key: "specialty", header: "Spécialité" },
      { key: "avgRating", header: "Note moy." },
      { key: "ratingCount", header: "Nb avis" },
      { key: "totalRdv", header: "Total RDV" },
      { key: "noShowRate", header: "Abs. %" },
      { key: "completionRate", header: "Terminés %" },
      { key: "cancelRate", header: "Annulés %" },
    ];
    if (fmt === "csv") return toCsv(exportRows, columns, "qualite-medecins");
    return await toXlsx(exportRows, columns, "qualite-medecins", "Qualité Médecins");
  }

  // ── Monthly trend (only when filtering by a single doctor) ─────────────
  let monthlyTrend: MonthlyTrend[] | undefined;
  if (doctorIdFilter) {
    const trendFrom = new Date(now);
    trendFrom.setMonth(trendFrom.getMonth() - 5);
    trendFrom.setDate(1);
    trendFrom.setHours(0, 0, 0, 0);

    const trendAppt = await db
      .select({
        month: sql<string>`to_char(${appointments.startsAt}, 'YYYY-MM')`,
        total: count(appointments.id),
        noShow: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'no_show')`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorIdFilter),
          gte(appointments.startsAt, trendFrom),
          lte(appointments.startsAt, now),
        ),
      )
      .groupBy(sql`to_char(${appointments.startsAt}, 'YYYY-MM')`);

    const trendReviews = await db
      .select({
        month: sql<string>`to_char(${reviews.createdAt}, 'YYYY-MM')`,
        avgRating: avg(reviews.rating),
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.doctorId, doctorIdFilter),
          gte(reviews.createdAt, trendFrom),
          lte(reviews.createdAt, now),
          eq(reviews.status, "published"),
        ),
      )
      .groupBy(sql`to_char(${reviews.createdAt}, 'YYYY-MM')`);

    const reviewTrendMap = new Map(trendReviews.map((r) => [r.month, r.avgRating]));

    // Generate last 6 calendar months
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(m);
    }

    const apptTrendMap = new Map(trendAppt.map((r) => [r.month, r]));

    monthlyTrend = months.map((month) => {
      const apptRow = apptTrendMap.get(month);
      const total = Number(apptRow?.total ?? 0);
      const noShow = Number(apptRow?.noShow ?? 0);
      const rawAvg = reviewTrendMap.get(month);
      return {
        month,
        avgRating: rawAvg != null ? Math.round(Number(rawAvg) * 10) / 10 : null,
        noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
        totalRdv: total,
      };
    });
  }

  return NextResponse.json({
    doctors: doctorsList,
    rangeFrom: rangeFrom.toISOString(),
    rangeTo: rangeTo.toISOString(),
    ...(monthlyTrend ? { monthlyTrend } : {}),
  });
}
