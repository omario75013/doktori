import { NextResponse } from "next/server";
import { db, waitlist } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

// Cron: every 10 minutes
// Notifies patients on the waitlist (source='patient') when the doctor has an
// available slot today. An "available slot" is defined as a cancelled appointment
// on the preferred date — i.e., a slot that opened up.
//
// Uses a single JOIN query with EXISTS to avoid N+1 queries.

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Single query: find notifiable waitlist entries where a cancelled slot exists
  // on the preferred date for that doctor (replaces N+1 pattern).
  const candidates = await db.execute(sql`
    SELECT w.id, w.doctor_id AS "doctorId", w.preferred_date AS "preferredDate",
           p.phone AS "patientPhone", p.name AS "patientName",
           d.name AS "doctorName", d.slug AS "doctorSlug"
    FROM waitlist w
    JOIN patients p ON p.id = w.patient_id
    JOIN doctors d ON d.id = w.doctor_id
    WHERE w.source = 'patient'
      AND w.preferred_date <= CURRENT_DATE
      AND w.notified_at IS NULL
      AND EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.doctor_id = w.doctor_id
          AND DATE(a.starts_at) = w.preferred_date::date
          AND a.status = 'cancelled'
      )
    LIMIT 50
  `) as unknown as Array<{
    id: string;
    doctorId: string;
    preferredDate: string;
    patientPhone: string;
    patientName: string;
    doctorName: string;
    doctorSlug: string;
  }>;

  let sent = 0;

  for (const candidate of candidates) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://doktori.tn";
    const bookUrl = `${baseUrl}/rdv/${candidate.doctorSlug}`;
    const msg = `Doktori: Un creneau s'est libere chez Dr. ${candidate.doctorName} ! Reservez: ${bookUrl}`;

    // Fire-and-forget — never block the cron
    sendSMS(candidate.patientPhone, msg).catch(console.error);

    // Mark notified immediately so re-runs don't double-fire
    await db
      .update(waitlist)
      .set({ notifiedAt: sql`now()` })
      .where(eq(waitlist.id, candidate.id));

    sent++;
  }

  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ sent, candidates: candidates.length, date: today });
}
