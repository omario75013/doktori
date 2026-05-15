/**
 * clinic-doctor-guard.ts
 *
 * Guard helper for API routes that must be forbidden for clinic-created doctors.
 *
 * Usage with requireDoctor():
 *   const doctor = await requireDoctor(req);
 *   if (doctor instanceof NextResponse) return doctor;
 *   const rejected = rejectClinicDoctorSession(doctor);
 *   if (rejected) return rejected;
 *
 * Usage with auth():
 *   const session = await auth();
 *   const rejected = rejectClinicDoctor(session);
 *   if (rejected) return rejected;
 */

import type { Session } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Returns a 403 NextResponse if the session belongs to a clinic-created doctor.
 * Returns null if the session is fine to proceed.
 */
export function rejectClinicDoctor(session: Session | null): NextResponse | null {
  if (!session) return null;
  const createdByClinicId = ((session.user as unknown) as Record<string, unknown>).createdByClinicId as string | null | undefined;
  if (createdByClinicId) {
    return NextResponse.json(
      { error: "Fonctionnalité réservée aux médecins indépendants" },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Returns a 403 NextResponse if the DoctorSession belongs to a clinic-created doctor.
 * Accepts the object returned by requireDoctor().
 */
export function rejectClinicDoctorSession(doctor: { createdByClinicId?: string | null }): NextResponse | null {
  if (doctor.createdByClinicId) {
    return NextResponse.json(
      { error: "Fonctionnalité réservée aux médecins indépendants" },
      { status: 403 }
    );
  }
  return null;
}
