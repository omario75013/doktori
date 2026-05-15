import { NextRequest, NextResponse } from "next/server";
import { db, clinicRooms, clinicSites, clinicDoctors } from "@doktori/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";

// GET /api/doctor/clinic-rooms?clinicId=<uuid>
// Returns all active rooms across all sites of the given clinic,
// provided the authenticated doctor is a member of that clinic.
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = "doctorId" in user ? user.doctorId : null;
  if (!doctorId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get("clinicId");

  if (!clinicId) {
    return NextResponse.json({ error: "clinicId est obligatoire" }, { status: 400 });
  }

  // Verify the doctor is a member of this clinic
  const [membership] = await db
    .select({ id: clinicDoctors.id })
    .from(clinicDoctors)
    .where(and(eq(clinicDoctors.clinicId, clinicId), eq(clinicDoctors.doctorId, doctorId)))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const rooms = await db
    .select({
      id: clinicRooms.id,
      siteId: clinicRooms.siteId,
      siteName: clinicSites.name,
      name: clinicRooms.name,
      color: clinicRooms.color,
    })
    .from(clinicRooms)
    .innerJoin(clinicSites, eq(clinicRooms.siteId, clinicSites.id))
    .where(and(eq(clinicSites.clinicId, clinicId), eq(clinicRooms.isActive, true)))
    .orderBy(asc(clinicSites.name), asc(clinicRooms.name));

  return NextResponse.json({ rooms });
}
