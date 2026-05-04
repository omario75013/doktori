import { NextRequest, NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";

export const dynamic = "force-dynamic";

/**
 * Mark the onboarding tour as skipped. The tour will not auto-launch again
 * for this doctor — they can still re-trigger it manually if a "Refaire le
 * tour" button is added later.
 */
export async function POST(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  await db
    .update(doctors)
    .set({
      onboardingTourSkipped: true,
      updatedAt: new Date(),
    })
    .where(eq(doctors.id, doctor.id));

  return NextResponse.json({ ok: true });
}
