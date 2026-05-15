import { NextRequest, NextResponse } from "next/server";
import { db, clinicInvitations } from "@doktori/db";
import { and, eq, gt, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET /api/doctor/invitations/pending-count
// Returns { count } — number of pending clinic invitations for the logged-in doctor.
// Drives the sidebar "Invitations" badge.
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ count: 0 });
  }

  const now = new Date();

  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(clinicInvitations)
    .where(
      and(
        eq(clinicInvitations.doctorId, user.id),
        eq(clinicInvitations.status, "pending"),
        gt(clinicInvitations.expiresAt, now)
      )
    );

  return NextResponse.json({ count: row?.c ?? 0 });
}
