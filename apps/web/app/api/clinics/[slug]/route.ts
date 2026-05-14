import { NextRequest, NextResponse } from "next/server";
import {
  db,
  clinics,
  clinicDoctors,
  doctors,
  doctorPractices,
} from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [clinic] = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      address: clinics.address,
      city: clinics.city,
      phone: clinics.phone,
      email: clinics.email,
      logoUrl: clinics.logoUrl,
    })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);

  if (!clinic) {
    return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });
  }

  // Doctors linked to this clinic
  const doctorRows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      specialty: doctors.specialty,
      photoUrl: doctors.photoUrl,
      consultationFee: doctors.consultationFee,
      role: clinicDoctors.role,
    })
    .from(clinicDoctors)
    .innerJoin(doctors, eq(clinicDoctors.doctorId, doctors.id))
    .where(
      and(eq(clinicDoctors.clinicId, clinic.id), eq(doctors.isActive, true))
    );

  // Practices linked to this clinic
  const practiceRows = await db
    .select({
      id: doctorPractices.id,
      doctorId: doctorPractices.doctorId,
      address: doctorPractices.address,
      city: doctorPractices.city,
      phone: doctorPractices.phone,
    })
    .from(doctorPractices)
    .where(
      and(
        eq(doctorPractices.clinicId, clinic.id),
        eq(doctorPractices.isActive, true)
      )
    );

  return NextResponse.json({
    clinic,
    doctors: doctorRows,
    practices: practiceRows,
  });
}
