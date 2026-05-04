import { NextRequest, NextResponse } from "next/server";
import { db, doctorBenchmarkSnapshots } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

/**
 * Returns the doctor's own benchmark snapshot vs peers in the same
 * (specialty, city) cohort. Returns 404 if the snapshot has not been
 * computed yet (i.e. the daily cron has not run since the doctor signed up).
 *
 * No data about *other* doctors is ever exposed — only ranks and the cohort size.
 */
export async function GET(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const [snap] = await db
    .select()
    .from(doctorBenchmarkSnapshots)
    .where(eq(doctorBenchmarkSnapshots.doctorId, doctor.id))
    .limit(1);

  if (!snap) {
    return NextResponse.json(
      {
        available: false,
        reason: "not_computed_yet",
      },
      { status: 200 }
    );
  }

  const cohortSize = snap.noShowTotalSpecialty ?? 0;
  // A "cohort" needs at least 3 peers for any ranking to be meaningful.
  // If you're alone in your specialty + city we hide the comparison rather
  // than show "1 of 1" everywhere.
  const meaningful = cohortSize >= 3;

  return NextResponse.json({
    available: meaningful,
    specialty: snap.specialty,
    city: snap.city,
    cohortSize,
    metrics: {
      noShowRate: snap.noShowRate !== null ? Number(snap.noShowRate) : null,
      noShowRank: snap.noShowRankSpecialty,
      avgRating: snap.avgRating !== null ? Number(snap.avgRating) : null,
      ratingRank: snap.ratingRankSpecialty,
      appointments30d: snap.totalAppointments30d,
      appointmentsRank: snap.appointmentsRankSpecialty,
    },
    computedAt: snap.computedAt,
  });
}
