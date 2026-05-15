/**
 * patient-identity.ts
 *
 * Identity resolution helper for patient creation.
 * Implements the spec matching priority: CIN → Phone → Email → create new.
 * Never overwrites existing data on a matched record.
 */

import { db, patients, patientMedicalProfile } from "@doktori/db";
import { eq } from "drizzle-orm";

export type PatientInput = {
  cin?: string | null;
  phone?: string | null;
  email?: string | null;
  name: string; // required for create
  dateOfBirth?: string | null; // ISO date
  gender?: string | null;
  createdByClinicId?: string | null; // for /api/clinique/patients
};

export type PatientResolveResult = {
  patientId: string;
  matched: "cin" | "phone" | "email" | null; // null = newly created
};

/**
 * Resolve an existing patient by CIN / phone / email, or create a new one.
 * Matching order: CIN first, then phone, then email.
 * On match, existing row is returned as-is (no field overwrite).
 */
export async function resolveOrCreatePatient(
  input: PatientInput
): Promise<PatientResolveResult> {
  // 1. CIN match
  if (input.cin?.trim()) {
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.cin, input.cin.trim()))
      .limit(1);
    if (existing) {
      return { patientId: existing.id, matched: "cin" };
    }
  }

  // 2. Phone match
  if (input.phone?.trim()) {
    const normalizedPhone = input.phone.replace(/\s+/g, "").trim();
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.phone, normalizedPhone))
      .limit(1);
    if (existing) {
      return { patientId: existing.id, matched: "phone" };
    }
  }

  // 3. Email match
  if (input.email?.trim()) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.email, normalizedEmail))
      .limit(1);
    if (existing) {
      return { patientId: existing.id, matched: "email" };
    }
  }

  // 4. Create new patient + empty medical profile
  const patientId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(patients).values({
      id: patientId,
      name: input.name.trim(),
      phone: input.phone ? input.phone.replace(/\s+/g, "").trim() : "",
      email: input.email?.trim().toLowerCase() || null,
      cin: input.cin?.trim() || null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      createdByClinicId: input.createdByClinicId ?? null,
      authMethod: "otp",
    });

    await tx.insert(patientMedicalProfile).values({
      id: crypto.randomUUID(),
      patientId,
    });
  });

  return { patientId, matched: null };
}
