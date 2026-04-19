import { NextResponse } from "next/server";
import { db, doctorPractices, clinics } from "@doktori/db";
import { eq, and, desc, asc } from "drizzle-orm";

// Public endpoint — no auth required.
// Returns active practices for a doctor ordered by primary first.
// Includes clinic name when the practice is linked to a clinic.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await db
    .select({
      id: doctorPractices.id,
      name: doctorPractices.name,
      address: doctorPractices.address,
      city: doctorPractices.city,
      phone: doctorPractices.phone,
      isPrimary: doctorPractices.isPrimary,
      clinicId: doctorPractices.clinicId,
      clinicName: clinics.name,
    })
    .from(doctorPractices)
    .leftJoin(clinics, eq(doctorPractices.clinicId, clinics.id))
    .where(and(eq(doctorPractices.doctorId, id), eq(doctorPractices.isActive, true)))
    .orderBy(desc(doctorPractices.isPrimary), asc(doctorPractices.createdAt));

  return NextResponse.json(rows);
}
