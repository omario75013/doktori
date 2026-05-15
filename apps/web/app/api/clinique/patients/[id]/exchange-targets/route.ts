import { NextResponse } from "next/server";
import { db, appointments, doctorPractices, clinics } from "@doktori/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { assertPatientBelongsToClinic } from "@/lib/clinic-membership";

/**
 * GET /api/clinique/patients/[id]/exchange-targets
 * Returns the list of OTHER clinics this patient also has appointments at.
 * Used to populate the "Share with clinic" popover.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id: patientId } = await params;

  try {
    await assertPatientBelongsToClinic(patientId, clinic.id);
  } catch {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  // Find all practice IDs associated with this clinic.
  const myPracticeRows = await db
    .select({ id: doctorPractices.id })
    .from(doctorPractices)
    .where(eq(doctorPractices.clinicId, clinic.id));
  const myPracticeIds = myPracticeRows.map((r) => r.id);

  // Find ALL appointments of this patient; filter in JS to exclude our own practices.
  const otherApptRows = await db
    .select({
      practiceId: appointments.practiceId,
    })
    .from(appointments)
    .where(and(eq(appointments.patientId, patientId)));

  // Filter to appointments outside our practice set.
  const otherPracticeIds = [
    ...new Set(
      otherApptRows
        .map((r) => r.practiceId)
        .filter((id): id is string => id !== null && !myPracticeIds.includes(id))
    ),
  ];

  if (otherPracticeIds.length === 0) {
    return NextResponse.json({ clinics: [] });
  }

  // Resolve clinic IDs from those practices.
  const practiceRows = await db
    .select({
      clinicId: doctorPractices.clinicId,
    })
    .from(doctorPractices)
    .where(inArray(doctorPractices.id, otherPracticeIds));

  const otherClinicIds = [
    ...new Set(
      practiceRows
        .map((r) => r.clinicId)
        .filter((id): id is string => id !== null && id !== clinic.id)
    ),
  ];

  if (otherClinicIds.length === 0) {
    return NextResponse.json({ clinics: [] });
  }

  // Fetch clinic details.
  const clinicRows = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      city: clinics.city,
    })
    .from(clinics)
    .where(inArray(clinics.id, otherClinicIds));

  return NextResponse.json({ clinics: clinicRows });
}
