import { NextResponse } from "next/server";
import { db, appointments, patients, doctors } from "@doktori/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { appointmentReminder } from "@/emails/templates";
import { sendWhatsApp } from "@/lib/whatsapp";
import { signReminderToken } from "@/lib/reminder-token";
import { sendPushToPatient } from "@/lib/push";
import { SPECIALTIES } from "@doktori/shared";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();

  // J-1 reminders: appointments tomorrow
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));

  const tomorrowAppts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      patientId: appointments.patientId,
      patientPhone: patients.phone,
      patientName: patients.name,
      patientEmail: patients.email,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorAddress: doctors.address,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(and(
      gte(appointments.startsAt, tomorrowStart),
      lte(appointments.startsAt, tomorrowEnd),
      eq(appointments.status, "confirmed"),
    ));

  let sent = 0;
  for (const appt of tomorrowAppts) {
    const time = format(appt.startsAt, "HH:mm");
    const date = format(appt.startsAt, "EEEE d MMMM", { locale: fr });
    const specialty = SPECIALTIES.find((s) => s.id === appt.doctorSpecialty)?.label || "";

    const token = signReminderToken(appt.id);
    const link = `${PUBLIC_URL}/r/${token}`;
    const message = `Rappel Doktori: RDV demain ${date} a ${time} avec ${appt.doctorName} (${specialty}), ${appt.doctorAddress}. Confirmer/annuler: ${link}`;

    await sendSMS(appt.patientPhone, message, appt.id);

    // Email reminder (best-effort)
    if (appt.patientEmail) {
      try {
        const email = appointmentReminder({
          patientName: appt.patientName || "Patient",
          doctorName: appt.doctorName,
          specialty,
          date,
          time,
          address: appt.doctorAddress,
          confirmUrl: link,
          cancelUrl: link,
          daysAhead: 1,
        });
        await sendEmail({ to: appt.patientEmail, ...email, appointmentId: appt.id });
      } catch (e) {
        console.error("Email reminder failed:", e);
      }
    }

    try {
      await sendWhatsApp(
        appt.patientPhone,
        "appointment_reminder",
        [appt.patientName || "Patient", appt.doctorName, date, time, appt.doctorAddress],
        appt.id,
      );
    } catch (e) {
      console.error("WhatsApp reminder failed:", e);
    }

    // Push notification reminder (best-effort)
    if (appt.patientId) {
      sendPushToPatient(
        appt.patientId,
        "Rappel de rendez-vous",
        `RDV demain à ${time} avec ${appt.doctorName}`,
        { type: "reminder", appointmentId: appt.id },
      ).catch(console.error);
    }

    sent++;
  }

  return NextResponse.json({ sent, date: now.toISOString() });
}
