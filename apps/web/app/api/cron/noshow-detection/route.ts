import { NextResponse } from "next/server";
import { db, appointments, patients, doctors } from "@doktori/db";
import { eq, and, lt, sql, not, inArray } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

const NOSHOW_THRESHOLD_MINUTES = 30; // 30 min after end time → auto no-show
const AUTO_SUSPEND_THRESHOLD = 3; // suspend after 3 no-shows

/**
 * Auto-detect no-shows: confirmed appointments whose end time passed 30+ min ago
 * and status is still "confirmed" (doctor didn't mark them manually).
 * Also handles progressive ban: suspend patient after 3 no-shows.
 * Runs every 15 minutes.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - NOSHOW_THRESHOLD_MINUTES * 60 * 1000);

  // Find confirmed appointments that ended 30+ min ago (still not marked)
  const stale = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      patientPhone: patients.phone,
      patientEmail: patients.email,
      patientName: patients.name,
      patientNoShows: patients.noShowCount,
      doctorName: doctors.name,
      startsAt: appointments.startsAt,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(and(
      eq(appointments.status, "confirmed"),
      lt(appointments.endsAt, cutoff),
    ))
    .limit(50);

  let marked = 0;
  let suspended = 0;

  for (const appt of stale) {
    // Mark as no_show
    await db
      .update(appointments)
      .set({ status: "no_show", updatedAt: new Date() })
      .where(eq(appointments.id, appt.id));

    // Increment noShowCount
    const newCount = (appt.patientNoShows ?? 0) + 1;
    await db
      .update(patients)
      .set({ noShowCount: sql`${patients.noShowCount} + 1` })
      .where(eq(patients.id, appt.patientId));

    // SMS notification to patient
    try {
      const msg = newCount >= AUTO_SUSPEND_THRESHOLD
        ? `Doktori: Vous avez manqué votre RDV avec ${appt.doctorName}. Après ${newCount} absences, votre compte a été suspendu. Contactez-nous pour le réactiver.`
        : `Doktori: Vous avez manqué votre RDV avec ${appt.doctorName}. Merci de prévenir à l'avance en cas d'empêchement. (${newCount}/3 absences)`;
      await sendSMS(appt.patientPhone, msg, appt.id);
    } catch {}

    // Email notification
    if (appt.patientEmail) {
      try {
        await sendEmail({
          to: appt.patientEmail,
          subject: `Rendez-vous manqué — ${appt.doctorName}`,
          html: `<div style="font-family:sans-serif;max-width:500px">
            <h2 style="color:#DC2626">Rendez-vous manqué</h2>
            <p>Bonjour ${appt.patientName || ""},</p>
            <p>Vous n'avez pas honoré votre rendez-vous avec ${appt.doctorName}.</p>
            <p>Merci de prévenir à l'avance en cas d'empêchement, afin de libérer le créneau pour d'autres patients.</p>
            <p style="color:#6b7280;font-size:13px">Nombre d'absences : ${newCount}/3</p>
            ${newCount >= AUTO_SUSPEND_THRESHOLD
              ? '<p style="color:#DC2626;font-weight:bold">Votre compte a été temporairement suspendu. Contactez-nous pour le réactiver.</p>'
              : ''}
          </div>`,
          appointmentId: appt.id,
        });
      } catch {}
    }

    // Auto-suspend after threshold
    if (newCount >= AUTO_SUSPEND_THRESHOLD) {
      await db
        .update(patients)
        .set({
          isSuspended: true,
          suspensionReason: `Suspension automatique : ${newCount} absences non-justifiées`,
          suspendedAt: new Date(),
        })
        .where(eq(patients.id, appt.patientId));
      suspended++;
    }

    marked++;
  }

  return NextResponse.json({ marked, suspended, checked: stale.length });
}
