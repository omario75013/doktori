import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type DoctorSession = {
  id: string;
  email: string;
};

/**
 * Guard a doctor-facing API route. Returns the doctor session or a 401 NextResponse.
 *
 * Usage:
 *   const doctor = await requireDoctor();
 *   if (doctor instanceof NextResponse) return doctor;
 *   // ...use doctor.id here
 */
export async function requireDoctor(): Promise<DoctorSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return { id: session.user.id, email: session.user.email ?? "" };
}
