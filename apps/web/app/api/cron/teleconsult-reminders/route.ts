import { NextResponse } from "next/server";
import { db, appointments, patients, doctors, teleconsultations } from "@doktori/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { teleconsultLink } from "@/emails/templates";
import { format, addMinutes } from "date-fns";
import { fr } from "date-fns/locale";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

/**
 * Send reminders for teleconsult appointments starting in the next 30 minutes.
 * Runs every 15 minutes.
 * Sends SMS + email to patient + email to doctor with the Jitsi join link.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const thirtyMinFromNow = addMinutes(now, 30);

  // Find teleconsult appointments starting in the next 30 minutes
  const upcoming = await db
    .select({
      appointmentId: appointments.id,
      startsAt: appointments.startsAt,
      patientPhone: patients.phone,
      patientEmail: patients.email,
      patientName: patients.name,
      doctorEmail: doctors.email,
      doctorName: doctors.name,
      roomName: teleconsultations.roomName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(teleconsultations, eq(teleconsultations.appointmentId, appointments.id))
    .where(and(
      eq(appointments.type, "teleconsult"),
      eq(appointments.status, "confirmed"),
      gte(appointments.startsAt, now),
      lte(appointments.startsAt, thirtyMinFromNow),
    ));

  let sent = 0;
  for (const appt of upcoming) {
    const joinUrl = `https://meet.jit.si/${appt.roomName}`;
    const time = format(appt.startsAt, "HH:mm");
    const date = format(appt.startsAt, "EEEE d MMMM", { locale: fr });
    const minutesUntil = Math.round((appt.startsAt.getTime() - now.getTime()) / 60000);

    // SMS to patient
    try {
      await sendSMS(
        appt.patientPhone,
        `Doktori: Votre téléconsultation avec ${appt.doctorName} commence dans ${minutesUntil} min. Rejoindre: ${joinUrl}`,
        appt.appointmentId,
      );
    } catch {}

    // Email to patient
    if (appt.patientEmail) {
      try {
        const email = teleconsultLink({
          recipientName: appt.patientName || "Patient",
          otherPartyName: appt.doctorName,
          date,
          time,
          joinUrl,
          minutesUntil,
        });
        await sendEmail({ to: appt.patientEmail, ...email, appointmentId: appt.appointmentId });
      } catch {}
    }

    // Email to doctor
    if (appt.doctorEmail) {
      try {
        const doctorEmail = teleconsultLink({
          recipientName: `Dr. ${appt.doctorName}`,
          otherPartyName: appt.patientName || "Patient",
          date,
          time,
          joinUrl,
          minutesUntil,
        });
        await sendEmail({ to: appt.doctorEmail, ...doctorEmail, appointmentId: appt.appointmentId });
      } catch {}
    }

    sent++;
  }

  return NextResponse.json({ sent, found: upcoming.length });
}
