import { NextResponse, type NextRequest } from "next/server";
import { db, patientReferrals } from "@doktori/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET /api/doctor/referrals/pending-count
// Returns { count } — number of incoming referrals where status='pending'
// for the authenticated doctor. Drives the sidebar "Référencements" badge.
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
    return NextResponse.json({ count: 0 });
  }
  const doctorId = user.role === "doctor" ? user.id : user.doctorId;
  if (!doctorId) return NextResponse.json({ count: 0 });

  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(patientReferrals)
    .where(
      and(
        eq(patientReferrals.toDoctorId, doctorId),
        eq(patientReferrals.status, "pending"),
      ),
    );

  return NextResponse.json({ count: row?.c ?? 0 });
}
