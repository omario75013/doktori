import { NextResponse } from "next/server";
import { db, doctorPractices, doctors, clinicDoctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

/**
 * GET /api/clinique/practices
 * Returns all doctor_practices rows whose clinic_id === this clinic.
 * Optionally filtered by ?doctorId=<uuid> for the cabinet selector.
 *
 * Response: { practices: Array<{ id, name, address, city, doctorId, doctorName }> }
 */
export async function GET(req: Request) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const url = new URL(req.url);
  const filterDoctorId = url.searchParams.get("doctorId");

  const conditions = [eq(doctorPractices.clinicId, clinic.id)];
  if (filterDoctorId) {
    conditions.push(eq(doctorPractices.doctorId, filterDoctorId));
  }

  const rows = await db
    .select({
      id: doctorPractices.id,
      name: doctorPractices.name,
      address: doctorPractices.address,
      city: doctorPractices.city,
      doctorId: doctorPractices.doctorId,
      doctorName: doctors.name,
    })
    .from(doctorPractices)
    .innerJoin(doctors, eq(doctorPractices.doctorId, doctors.id))
    .innerJoin(clinicDoctors, and(
      eq(clinicDoctors.doctorId, doctorPractices.doctorId),
      eq(clinicDoctors.clinicId, clinic.id)
    ))
    .where(and(...conditions));

  return NextResponse.json({ practices: rows });
}
