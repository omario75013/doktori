import { db, clinicDoctors, doctorPractices } from "@doktori/db";
import { eq } from "drizzle-orm";

export interface ClinicScope {
  doctorIds: string[];
  practiceIds: string[];
}

/**
 * Returns both the doctor IDs and practice IDs belonging to a clinic.
 * Use practiceIds to scope appointment queries to only clinic practices
 * (not a doctor's private cabinet).
 */
export async function getClinicScope(clinicId: string): Promise<ClinicScope> {
  const [clinicDoctorRows, practiceRows] = await Promise.all([
    db
      .select({ doctorId: clinicDoctors.doctorId })
      .from(clinicDoctors)
      .where(eq(clinicDoctors.clinicId, clinicId)),
    db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(eq(doctorPractices.clinicId, clinicId)),
  ]);

  return {
    doctorIds: clinicDoctorRows.map((r) => r.doctorId),
    practiceIds: practiceRows.map((r) => r.id),
  };
}
