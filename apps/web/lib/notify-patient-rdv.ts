import { db, appointments, doctors, patientNotifications } from "@doktori/db";
import { eq } from "drizzle-orm";

// Insert a patient_notifications row describing a change made to one of the
// patient's appointments by the doctor or secretary. Fire-and-forget — errors
// are logged but never bubble back to the caller, mirroring the pattern used
// for SMS/email side-effects elsewhere.

type Kind = "confirmed" | "cancelled" | "rescheduled";

function fmt(d: Date): string {
  // Tunisian users expect "lundi 12 mai · 14:30". Keep it locale-stable
  // (server runtime) — the patient app can re-format if needed.
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export async function notifyPatientAppointmentChange(
  appointmentId: string,
  kind: Kind,
  opts: {
    previousStartsAt?: Date | null;
    reason?: string | null;
  } = {},
) {
  try {
    const [appt] = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        startsAt: appointments.startsAt,
        doctorId: appointments.doctorId,
        doctorName: doctors.name,
      })
      .from(appointments)
      .leftJoin(doctors, eq(doctors.id, appointments.doctorId))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appt || !appt.patientId) return;

    const drName = appt.doctorName ? `Dr ${appt.doctorName}` : "Le médecin";
    const when = fmt(new Date(appt.startsAt));
    let title = "";
    let body = "";
    let type: "rdv_confirmed" | "rdv_cancelled" | "rdv_rescheduled";

    if (kind === "confirmed") {
      type = "rdv_confirmed";
      title = "Rendez-vous confirmé";
      body = `${drName} a confirmé votre rendez-vous du ${when}.`;
    } else if (kind === "cancelled") {
      type = "rdv_cancelled";
      title = "Rendez-vous annulé";
      body = `${drName} a annulé votre rendez-vous du ${when}.${
        opts.reason ? ` Motif : ${opts.reason}` : ""
      }`;
    } else {
      type = "rdv_rescheduled";
      title = "Rendez-vous décalé";
      const previous = opts.previousStartsAt
        ? fmt(new Date(opts.previousStartsAt))
        : null;
      body = previous
        ? `${drName} a décalé votre rendez-vous du ${previous} au ${when}.`
        : `${drName} a décalé votre rendez-vous au ${when}.`;
    }

    await db.insert(patientNotifications).values({
      patientId: appt.patientId,
      type,
      title,
      body,
      link: `/mes-rdv`,
    });
  } catch (err) {
    console.error("[notify-patient-rdv]", err);
  }
}
