import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { buildCancellationFollowupEmail } from "@/emails/templates";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

/**
 * Daily cron (9am). Sends follow-up email + SMS to patients who cancelled
 * an appointment yesterday, giving them an easy way to rebook.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const cancelled = await db.execute(sql`
    SELECT a.id, a.cancelled_at, p.name, p.email, p.phone,
           d.name AS doctor_name, d.slug AS doctor_slug
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.status = 'cancelled'
      AND a.cancelled_at::date = (CURRENT_DATE - interval '1 day')::date
    LIMIT 50
  `);

  let emailsSent = 0;
  let smsSent = 0;

  for (const row of cancelled) {
    const appt = row as {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      doctor_name: string;
      doctor_slug: string;
    };

    // Send email if available
    if (appt.email) {
      try {
        const email = buildCancellationFollowupEmail({
          patientName: appt.name || "Patient",
          doctorName: appt.doctor_name,
          doctorSlug: appt.doctor_slug,
        });
        await sendEmail({
          to: appt.email,
          subject: email.subject,
          html: email.html,
          appointmentId: appt.id,
        });
        emailsSent++;
      } catch (e) {
        console.error("[cancellation-followup] email failed for appt", appt.id, e);
      }
    }

    // Send SMS if phone available
    if (appt.phone) {
      try {
        const message = `Doktori: Rendez-vous annulé avec Dr. ${appt.doctor_name}. Reprogrammer: ${PUBLIC_URL}/rdv/${appt.doctor_slug}`;
        await sendSMS(appt.phone, message, appt.id);
        smsSent++;
      } catch (e) {
        console.error("[cancellation-followup] SMS failed for appt", appt.id, e);
      }
    }
  }

  return NextResponse.json({ emailsSent, smsSent, total: cancelled.length });
}
