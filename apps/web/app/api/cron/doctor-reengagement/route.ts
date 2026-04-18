import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { buildReengagementEmail } from "@/emails/templates";

/**
 * Daily cron (10am). Sends re-engagement emails to doctors who haven't had
 * an appointment in 30 days and haven't already received a re-engagement
 * message this month.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const inactive30d = await db.execute(sql`
    SELECT d.id, d.name, d.email FROM doctors d
    WHERE d.is_active = true
      AND d.id NOT IN (
        SELECT DISTINCT doctor_id FROM appointments
        WHERE created_at > NOW() - interval '30 days'
      )
      AND d.id NOT IN (
        SELECT DISTINCT doctor_id FROM sms_logs
        WHERE message LIKE '%réengagement%' AND created_at > NOW() - interval '30 days'
      )
    LIMIT 20
  `);

  let sent = 0;
  for (const row of inactive30d) {
    const doctor = row as { id: string; name: string; email: string };
    if (!doctor.email) continue;

    try {
      const email = buildReengagementEmail({ doctorName: doctor.name });
      await sendEmail({ to: doctor.email, subject: email.subject, html: email.html });
      sent++;
    } catch (e) {
      console.error("[doctor-reengagement] email failed for doctor", doctor.id, e);
    }
  }

  return NextResponse.json({ sent, total: inactive30d.length });
}
