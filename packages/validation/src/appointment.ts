import { z } from "zod";

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  patientName: z.string().min(2, "Nom requis"),
  patientPhone: z.string().regex(/^(\+216|0)?[2-9]\d{7}$/, "Numéro invalide"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
  reason: z.string().max(200).optional(),
  appointmentTypeId: z.string().uuid().optional(),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
