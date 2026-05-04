import { NextResponse } from "next/server";
import { db, chronicTreatmentReminders, patients } from "@doktori/db";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();

  const due = await db
    .select({
      id: chronicTreatmentReminders.id,
      patientId: chronicTreatmentReminders.patientId,
      medicationName: chronicTreatmentReminders.medicationName,
      dosage: chronicTreatmentReminders.dosage,
      frequencyHours: chronicTreatmentReminders.frequencyHours,
      channel: chronicTreatmentReminders.notificationChannel,
      patientPhone: patients.phone,
      patientEmail: patients.email,
      patientName: patients.name,
    })
    .from(chronicTreatmentReminders)
    .innerJoin(patients, eq(chronicTreatmentReminders.patientId, patients.id))
    .where(
      and(
        eq(chronicTreatmentReminders.active, true),
        lte(chronicTreatmentReminders.nextReminderAt, now),
        or(
          isNull(chronicTreatmentReminders.pausedUntil),
          lte(chronicTreatmentReminders.pausedUntil, now)
        )
      )
    );

  let sent = 0;
  let failed = 0;

  for (const r of due) {
    const dose = r.dosage ? ` (${r.dosage})` : "";
    const message = `Rappel Doktori: il est temps de prendre votre traitement ${r.medicationName}${dose}.`;

    try {
      if (r.channel === "email" && r.patientEmail) {
        await sendEmail({
          to: r.patientEmail,
          subject: "Rappel de traitement",
          html: `<p>Bonjour ${r.patientName ?? ""},</p><p>${message}</p><p>—<br/>L'équipe Doktori</p>`,
          text: message,
        });
      } else if (r.patientPhone) {
        await sendSMS(r.patientPhone, message);
      }

      const next = new Date(now.getTime() + r.frequencyHours * 3600 * 1000);
      await db
        .update(chronicTreatmentReminders)
        .set({ lastSentAt: now, nextReminderAt: next, updatedAt: now })
        .where(eq(chronicTreatmentReminders.id, r.id));
      sent++;
    } catch (e) {
      console.error(`[chronic-reminders] dispatch failed for ${r.id}`, e);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: due.length, at: now.toISOString() });
}

export const GET = POST;
