import { auth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { getStaffFromRequest } from "@/lib/staff-auth";

export type DoctorSession = {
  id: string;
  email: string;
};

/**
 * Guard a doctor-facing API route. Returns the doctor session or a 401 NextResponse.
 *
 * Accepts NextAuth cookie (web) and Bearer JWT (mobile) via `getStaffFromRequest`.
 *
 * Usage:
 *   const doctor = await requireDoctor(req);
 *   if (doctor instanceof NextResponse) return doctor;
 */
export async function requireDoctor(
  req?: Request | NextRequest
): Promise<DoctorSession | NextResponse> {
  // 1. NextAuth cookie
  const session = await auth();
  if (session?.user?.id && session.user.role === "doctor") {
    return { id: session.user.id, email: session.user.email ?? "" };
  }

  // 2. Bearer JWT fallback
  if (req) {
    const staff = getStaffFromRequest(req);
    if (staff && staff.role === "doctor") {
      return { id: staff.id, email: "" };
    }
  }

  if (session?.user?.id) {
    return NextResponse.json({ error: "Accès réservé aux médecins" }, { status: 403 });
  }
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}
