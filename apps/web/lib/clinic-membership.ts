import { db, appointments, doctorPractices } from "@doktori/db";
import { eq, and, inArray, or, isNull } from "drizzle-orm";

/**
 * Verify that a patient has at least one appointment whose practice belongs
 * to the given clinic (or has a NULL practiceId for legacy data).
 * Throws if the membership check fails.
 */
export async function assertPatientBelongsToClinic(
  patientId: string,
  clinicId: string
): Promise<true> {
  // Fetch all practice IDs for this clinic
  const practiceRows = await db
    .select({ id: doctorPractices.id })
    .from(doctorPractices)
    .where(eq(doctorPractices.clinicId, clinicId));

  const practiceIds = practiceRows.map((r) => r.id);

  if (practiceIds.length === 0) {
    throw new Error("NOT_FOUND");
  }

  const practiceCondition =
    practiceIds.length > 0
      ? or(inArray(appointments.practiceId, practiceIds), isNull(appointments.practiceId))!
      : isNull(appointments.practiceId);

  const rows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        practiceCondition
      )
    )
    .limit(1);

  if (rows.length === 0) {
    throw new Error("NOT_FOUND");
  }

  return true;
}
