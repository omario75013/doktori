import { NextRequest, NextResponse } from "next/server";
import { db, doctorConnections, doctors } from "@doktori/db";
import { and, eq, or } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET /api/doctor/network/peers
// Accepted peer-doctors only (i.e. "Mon réseau") with the fields the
// referral picker needs. Doctors connected via doctorConnections in
// 'accepted' state — both directions — joined to the doctors table so
// the response is render-ready.
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Two queries, then merge — keeps the JOIN predicate simple and avoids
  // a CASE expression on the peer side.
  const asRequester = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      photoUrl: doctors.photoUrl,
    })
    .from(doctorConnections)
    .innerJoin(doctors, eq(doctors.id, doctorConnections.addresseeId))
    .where(
      and(
        eq(doctorConnections.requesterId, user.id),
        eq(doctorConnections.status, "accepted"),
        eq(doctors.isActive, true),
      ),
    );

  const asAddressee = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      photoUrl: doctors.photoUrl,
    })
    .from(doctorConnections)
    .innerJoin(doctors, eq(doctors.id, doctorConnections.requesterId))
    .where(
      and(
        eq(doctorConnections.addresseeId, user.id),
        eq(doctorConnections.status, "accepted"),
        eq(doctors.isActive, true),
      ),
    );

  const dedup = new Map<string, (typeof asRequester)[number]>();
  for (const r of [...asRequester, ...asAddressee]) dedup.set(r.id, r);
  // Suppress drizzle unused-import warning from `or` (kept for symmetry
  // if you ever want a single-query rewrite).
  void or;
  return NextResponse.json(Array.from(dedup.values()));
}
