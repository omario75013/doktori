import { NextRequest, NextResponse } from "next/server";
import { db, clinicInvitations, clinics } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET /api/doctor/invitations/token/[token]
// Look up an invitation by its token — used by the email-link landing page.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { token } = await params;

  const [row] = await db
    .select({
      id: clinicInvitations.id,
      clinicId: clinicInvitations.clinicId,
      doctorId: clinicInvitations.doctorId,
      role: clinicInvitations.role,
      status: clinicInvitations.status,
      expiresAt: clinicInvitations.expiresAt,
      createdAt: clinicInvitations.createdAt,
      clinicName: clinics.name,
      clinicCity: clinics.city,
    })
    .from(clinicInvitations)
    .innerJoin(clinics, eq(clinicInvitations.clinicId, clinics.id))
    .where(eq(clinicInvitations.token, token))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  }

  // Verify the invitation belongs to this doctor (if doctorId is set)
  if (row.doctorId && row.doctorId !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Check expiry
  if (row.status === "pending" && row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation expirée" }, { status: 410 });
  }

  return NextResponse.json({ invitation: row });
}
