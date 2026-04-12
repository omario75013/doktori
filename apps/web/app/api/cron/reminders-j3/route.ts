import { NextResponse } from "next/server";
import { db, appointments, patients, doctors } from "@doktori/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { appointmentReminder } from "@/emails/templates";
import { signReminderToken } from "@/lib/reminder-token";
import { SPECIALTIES } from "@doktori/shared";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

/**
 * J-3 reminders: email patients about appointments 3 days ahead.
 * Email only (too early for SMS). Runs daily.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const j3Start = startOfDay(addDays(now, 3));
  const j3End = endOfDay(addDays(now, 3));

  const appts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      patientEmail: patients.email,
      patientName: patients.name,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorAddress: doctors.address,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(and(
      gte(appointments.startsAt, j3Start),
      lte(appointments.startsAt, j3End),
      eq(appointments.status, "confirmed"),
    ));

  let sent = 0;
  for (const appt of appts) {
    if (!appt.patientEmail) continue;

    const time = format(appt.startsAt, "HH:mm");
    const date = format(appt.startsAt, "EEEE d MMMM", { locale: fr });
    const specialty = SPECIALTIES.find((s) => s.id === appt.doctorSpecialty)?.label || "";
    const token = signReminderToken(appt.id);
    const link = `${PUBLIC_URL}/r/${token}`;

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
        daysAhead: 3,
      });
      await sendEmail({ to: appt.patientEmail, ...email, appointmentId: appt.id });
      sent++;
    } catch (e) {
      console.error("J-3 email reminder failed:", e);
    }
  }

  return NextResponse.json({ sent, total: appts.length });
}
