import { z } from "zod";

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  patientName: z.string().min(2, "Nom requis"),
  patientPhone: z.string().regex(/^(\+216|0)?[2-9]\d{7}$/, "Numéro invalide"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
  reason: z.string().max(200).optional(),
  appointmentTypeId: z.string().uuid().optional(),
  // Beneficiary — when the appointment is for someone other than the account holder.
  // If beneficiaryName is set, the server creates (or reuses) a patient_dependents row.
  beneficiaryName: z.string().min(2).max(255).optional(),
  beneficiaryDateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  beneficiaryRelation: z.enum(["self", "child", "parent", "spouse", "other"]).optional(),
  // G3: questionnaire answers — map of questionId → answer value
  questionnaire: z.record(z.string().uuid(), z.string()).optional(),
  // G4 multi-practice: which practice location this appointment is for.
  practiceId: z.string().uuid().optional(),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
