import { redirect } from "next/navigation";
import {
  db,
  appointments,
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
import { QualiteClient, type DoctorQuality } from "./qualite-client";
import { doctors } from "@doktori/db";

export const dynamic = "force-dynamic";

export default async function CliniqueQualitePage() {
  const clinic = await requireClinic();
  if ("status" in clinic) redirect("/clinique-login");

  // Last 90 days
  const now = new Date();
  const rangeFrom = new Date(now);
  rangeFrom.setDate(rangeFrom.getDate() - 90);

  // Clinic doctor IDs
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (allDoctorIds.length === 0) {
    return (
      <QualiteClient
        doctors={[]}
        avgRating={null}
        noShowRate={0}
        totalRdv={0}
        totalReviews={0}
      />
    );
  }

  // Doctor details
  const doctorRows = await db
    .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(inArray(doctors.id, allDoctorIds));

  const doctorMap = new Map(doctorRows.map((d) => [d.id, d]));

  // Appointment aggregates
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
        lte(appointments.startsAt, now),
      ),
    )
    .groupBy(appointments.doctorId);

  const apptMap = new Map(apptAgg.map((r) => [r.doctorId, r]));

  // Review aggregates
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
        lte(reviews.createdAt, now),
        eq(reviews.status, "published"),
      ),
    )
    .groupBy(reviews.doctorId);

  const reviewMap = new Map(reviewAgg.map((r) => [r.doctorId, r]));

  // Build per-doctor list
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

  // Clinic-wide KPIs
  const totalRdv = doctorsList.reduce((s, d) => s + d.totalRdv, 0);
  const totalReviews = doctorsList.reduce((s, d) => s + d.ratingCount, 0);
  const totalNoShow = doctorsList.reduce(
    (s, d) => s + Math.round((d.noShowRate / 100) * d.totalRdv),
    0,
  );
  const noShowRate = totalRdv > 0 ? Math.round((totalNoShow / totalRdv) * 100) : 0;

  const ratedDoctors = doctorsList.filter((d) => d.avgRating !== null);
  const avgRating =
    ratedDoctors.length > 0
      ? Math.round(
          (ratedDoctors.reduce((s, d) => s + (d.avgRating ?? 0), 0) /
            ratedDoctors.length) *
            10,
        ) / 10
      : null;

  return (
    <QualiteClient
      doctors={doctorsList}
      avgRating={avgRating}
      noShowRate={noShowRate}
      totalRdv={totalRdv}
      totalReviews={totalReviews}
    />
  );
}
