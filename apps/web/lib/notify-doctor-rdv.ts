import { db, doctorNotifications } from "@doktori/db";

// Fire-and-forget doctor notification for patient-initiated appointment
// events (booking, reschedule, cancellation). Insert into doctor_notifications
// — jsonb payload mirrors the secretaryNotifications pattern.
type Kind =
  | "appointment_booked"
  | "appointment_rescheduled_by_patient"
  | "appointment_cancelled_by_patient";

export async function notifyDoctorAppointmentEvent(
  doctorId: string,
  kind: Kind,
  payload: Record<string, unknown>,
) {
  try {
    await db.insert(doctorNotifications).values({
      doctorId,
      type: kind,
      payload,
    });
  } catch (err) {
    console.error("[notify-doctor-rdv]", err);
  }
}
