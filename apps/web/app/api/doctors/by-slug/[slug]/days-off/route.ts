import { type NextRequest, NextResponse } from "next/server";
import { db, doctors, doctorDaysOff } from "@doktori/db";
import { and, eq, gte } from "drizzle-orm";

// GET /api/doctors/by-slug/[slug]/days-off
// Public — used by patient booking to check unavailable date ranges
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.slug, slug))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  const rows = await db
    .select({
      startDate: doctorDaysOff.startDate,
      endDate: doctorDaysOff.endDate,
    })
    .from(doctorDaysOff)
    .where(
      and(
        eq(doctorDaysOff.doctorId, doctor.id),
        gte(doctorDaysOff.endDate, new Date().toISOString().slice(0, 10))
      )
    )
    .orderBy(doctorDaysOff.startDate);

  return NextResponse.json(rows);
}
