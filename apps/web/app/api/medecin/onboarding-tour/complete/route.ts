import { NextRequest, NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

/**
 * Mark the onboarding tour as completed for the current doctor.
 * Idempotent — calling twice is fine, the timestamp just updates.
 */
export async function POST(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  await db
    .update(doctors)
    .set({
      onboardingTourCompletedAt: new Date(),
      // If a doctor "completes", clear any prior skip — they took the tour.
      onboardingTourSkipped: false,
      updatedAt: new Date(),
    })
    .where(eq(doctors.id, doctor.id));

  return NextResponse.json({ ok: true });
}
