import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConnections, doctors } from "@doktori/db";
import { and, eq, or, sql } from "drizzle-orm";

/**
 * GET /api/doctor/network/connections
 * Returns all accepted connections for the logged-in doctor.
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: doctorConnections.id,
      status: doctorConnections.status,
      doctorId: sql<string>`CASE WHEN ${doctorConnections.requesterId} = ${user.id} THEN ${doctorConnections.addresseeId} ELSE ${doctorConnections.requesterId} END`,
      name: doctors.name,
      specialty: doctors.specialty,
      city: doctors.city,
      photoUrl: doctors.photoUrl,
    })
    .from(doctorConnections)
    .innerJoin(
      doctors,
      sql`${doctors.id} = CASE WHEN ${doctorConnections.requesterId} = ${user.id} THEN ${doctorConnections.addresseeId} ELSE ${doctorConnections.requesterId} END`
    )
    .where(
      and(
        eq(doctorConnections.status, "accepted"),
        or(
          eq(doctorConnections.requesterId, user.id),
          eq(doctorConnections.addresseeId, user.id)
        )
      )
    );

  return NextResponse.json(rows);
}
