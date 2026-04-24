import { NextResponse, NextRequest } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

/**
 * GET /api/doctor/me — lightweight profile data for the logged-in doctor.
 * Used by the settings page and the mobile app's dashboard.
 * Accepts both NextAuth cookie (web) and Bearer JWT (mobile).
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [doctor] = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      email: doctors.email,
      slug: doctors.slug,
      totpEnabled: doctors.totpEnabled,
      totpEnrolledAt: doctors.totpEnrolledAt,
    })
    .from(doctors)
    .where(eq(doctors.id, user.id))
    .limit(1);

  if (!doctor) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(doctor);
}
