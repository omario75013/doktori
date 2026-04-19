import { NextRequest, NextResponse } from "next/server";
import { db, appointments, doctors, patientDependents, reviews } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const patientId = patient.id; // from verified JWT

  const results = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      doctorId: doctors.id,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorAddress: doctors.address,
      doctorSlug: doctors.slug,
      beneficiaryName: patientDependents.name,
      beneficiaryRelation: patientDependents.relation,
      reviewId: reviews.id,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(patientDependents, eq(appointments.dependentId, patientDependents.id))
    .leftJoin(reviews, eq(reviews.appointmentId, appointments.id))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.startsAt))
    .limit(50);

  return NextResponse.json(
    results.map((r) => ({ ...r, hasReview: r.reviewId !== null, reviewId: undefined })),
  );
}
