import { NextResponse } from "next/server";
import { db, appointments, patients, doctors, reviews } from "@doktori/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { reviewRequest, buildReviewReminderRetryEmail } from "@/emails/templates";
import { subDays, startOfDay, endOfDay } from "date-fns";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

/**
 * Send review request emails to patients whose appointments
 * completed yesterday and who haven't already left a review.
 * Also retries for appointments completed 4 days ago (requested 3 days ago)
 * that still have no review.
 * Runs daily.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const yesterday = subDays(new Date(), 1);
  const dayStart = startOfDay(yesterday);
  const dayEnd = endOfDay(yesterday);

  // Find completed appointments from yesterday without a review
  const completedAppts = await db
    .select({
      id: appointments.id,
      patientEmail: patients.email,
      patientName: patients.name,
      doctorName: doctors.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(and(
      eq(appointments.status, "completed"),
      gte(appointments.startsAt, dayStart),
      lte(appointments.startsAt, dayEnd),
      // No existing review for this appointment
      sql`NOT EXISTS (SELECT 1 FROM ${reviews} WHERE ${reviews.appointmentId} = ${appointments.id})`,
    ));

  let sent = 0;
  for (const appt of completedAppts) {
    if (!appt.patientEmail) continue;

    try {
      const email = reviewRequest({
        patientName: appt.patientName || "Patient",
        doctorName: appt.doctorName,
        reviewUrl: `${PUBLIC_URL}/avis/${appt.id}`,
      });
      await sendEmail({ to: appt.patientEmail, ...email, appointmentId: appt.id });
      sent++;
    } catch (e) {
      console.error("Review request email failed:", e);
    }
  }

  // Second pass: retry for appointments completed 4 days ago with no review yet
  const retries = await db.execute(sql`
    SELECT a.id, p.email, p.phone, p.name, d.name AS doctor_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN reviews r ON r.appointment_id = a.id
    WHERE a.status = 'completed'
      AND a.completed_at::date = (CURRENT_DATE - interval '4 days')::date
      AND r.id IS NULL
    LIMIT 30
  `);

  let retried = 0;
  for (const row of retries) {
    const appt = row as { id: string; email: string | null; name: string; doctor_name: string };
    if (!appt.email) continue;

    try {
      const email = buildReviewReminderRetryEmail({
        patientName: appt.name || "Patient",
        doctorName: appt.doctor_name,
        reviewUrl: `${PUBLIC_URL}/avis/${appt.id}`,
      });
      await sendEmail({
        to: appt.email,
        subject: email.subject,
        html: email.html,
        appointmentId: appt.id,
      });
      retried++;
    } catch (e) {
      console.error("Review retry email failed:", e);
    }
  }

  return NextResponse.json({ sent, total: completedAppts.length, retried, retryTotal: retries.length });
}
