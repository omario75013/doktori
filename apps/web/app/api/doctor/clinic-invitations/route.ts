import { NextRequest, NextResponse } from "next/server";
import { db, clinicInvitations, clinics } from "@doktori/db";
import { eq, and, gt } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Accès réservé aux médecins" }, { status: 403 });
  }

  const doctorId = user.id;
  const now = new Date();

  const rows = await db
    .select({
      id: clinicInvitations.id,
      clinicId: clinicInvitations.clinicId,
      role: clinicInvitations.role,
      status: clinicInvitations.status,
      expiresAt: clinicInvitations.expiresAt,
      createdAt: clinicInvitations.createdAt,
      clinicName: clinics.name,
      clinicCity: clinics.city,
    })
    .from(clinicInvitations)
    .innerJoin(clinics, eq(clinicInvitations.clinicId, clinics.id))
    .where(
      and(
        eq(clinicInvitations.doctorId, doctorId),
        eq(clinicInvitations.status, "pending"),
        gt(clinicInvitations.expiresAt, now)
      )
    );

  return NextResponse.json({ invitations: rows });
}
