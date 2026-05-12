import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { addWeeks } from "date-fns";

// POST /api/appointments/[id]/followup
// "Programmer un suivi" after a completed RDV — books a NEW appointment
// for the same patient + doctor + practice, N weeks later at the same
// hour. Defaults to status='pending' so the doctor can re-confirm (and
// the patient gets the in-app confirmation notification when they do).
//
// Previously this route inserted into the `waitlist` table, which meant
// the slot was never actually booked. Doctors clicking "Programmer un
// suivi" expected to see the follow-up appear in their /rendez-vous
// list — so we now insert into appointments directly.

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const weeks = Number(body.weeks);

  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 104) {
    return NextResponse.json(
      { error: "Délai invalide (1 à 104 semaines)" },
      { status: 400 },
    );
  }

  const [appt] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
    .limit(1);
  if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

  // Same time of day, N weeks later. Duration mirrors the source RDV.
  const newStartsAt = addWeeks(appt.startsAt, weeks);
  const duration = appt.endsAt.getTime() - appt.startsAt.getTime();
  const newEndsAt = new Date(newStartsAt.getTime() + duration);

  // Keep the appointment_type if any, and tag the reason so the source
  // is visible in the agenda. Practice stays the same.
  const followupReason = appt.reason
    ? `Suivi — ${appt.reason}`
    : "Suivi";

  const [created] = await db
    .insert(appointments)
    .values({
      doctorId: appt.doctorId,
      patientId: appt.patientId,
      practiceId: appt.practiceId,
      appointmentTypeId: appt.appointmentTypeId,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      type: appt.type,
      reason: followupReason,
      // Doctor-initiated, but kept pending so the patient receives a
      // confirmation notification on accept (mirrors the patient-booking
      // default introduced in v1.9.0).
      status: "pending",
      dependentId: appt.dependentId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
