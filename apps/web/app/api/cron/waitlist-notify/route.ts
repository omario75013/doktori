import { NextResponse } from "next/server";
import { db, waitlist, patients, doctors, appointments } from "@doktori/db";
import { eq, and, isNull, lte, gte, lt, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

// Cron: every 10 minutes
// Notifies patients on the waitlist (source='patient') when the doctor has an
// available slot today. An "available slot" is defined as a confirmed appointment
// that was cancelled after the waitlist entry was created — i.e., an opening
// appeared on or around the preferred date.
//
// Heuristic: check whether the doctor has fewer confirmed appointments today
// than their typical slot count (doctor_schedules), which is a reasonable
// proxy for "a slot freed up". To keep it simple, we just check that at least
// one slot today is NOT booked (i.e., the doctor has confirmed < max slots).
//
// Since slot availability is complex to compute generically, this cron uses
// a simpler signal: there exists at least one appointment for this doctor on
// preferredDate that is currently cancelled (freed slot) — the patient should
// be notified to book it.

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Find waitlist entries for 'patient' source whose preferredDate <= today
  // and have not been notified yet
  const candidates = await db
    .select({
      id: waitlist.id,
      doctorId: waitlist.doctorId,
      patientPhone: patients.phone,
      patientName: patients.name,
      doctorName: doctors.name,
      doctorSlug: doctors.slug,
      preferredDate: waitlist.preferredDate,
    })
    .from(waitlist)
    .innerJoin(patients, eq(waitlist.patientId, patients.id))
    .innerJoin(doctors, eq(waitlist.doctorId, doctors.id))
    .where(
      and(
        eq(waitlist.source, "patient"),
        lte(waitlist.preferredDate, today),
        isNull(waitlist.notifiedAt),
      ),
    )
    .limit(200);

  let sent = 0;

  for (const candidate of candidates) {
    // Check if a cancelled slot exists for this doctor on the preferred date
    // A cancelled appointment means a slot opened up
    const preferredDate = candidate.preferredDate; // YYYY-MM-DD
    const dayStart = new Date(`${preferredDate}T00:00:00Z`);
    const dayEnd = new Date(`${preferredDate}T23:59:59Z`);

    const cancelledSlots = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, candidate.doctorId),
          eq(appointments.status, "cancelled"),
          gte(appointments.startsAt, dayStart),
          lt(appointments.startsAt, dayEnd),
        ),
      )
      .limit(1);

    if (cancelledSlots.length === 0) continue;

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

  return NextResponse.json({ sent, candidates: candidates.length, date: today });
}
