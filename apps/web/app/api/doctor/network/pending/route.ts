import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConnections, doctors } from "@doktori/db";
import { and, eq } from "drizzle-orm";

/**
 * GET /api/doctor/network/pending
 * Returns pending inbound requests (others who want to connect with me).
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: doctorConnections.id,
      doctorId: doctorConnections.requesterId,
      name: doctors.name,
      specialty: doctors.specialty,
      city: doctors.city,
      photoUrl: doctors.photoUrl,
      status: doctorConnections.status,
    })
    .from(doctorConnections)
    .innerJoin(doctors, eq(doctors.id, doctorConnections.requesterId))
    .where(
      and(
        eq(doctorConnections.addresseeId, user.id),
        eq(doctorConnections.status, "pending")
      )
    );

  return NextResponse.json(rows);
}
