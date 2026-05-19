import { NextResponse } from "next/server";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";
import { db, appointments } from "@doktori/db";
import { and, eq, gte, lte } from "drizzle-orm";
import { broadcastSos } from "@/lib/sos-broadcast";

// POST /api/doctor/appointments/[id]/checkin — mark patient as arrived
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [appt] = await db
    .select({ id: appointments.id, status: appointments.status, checkedInAt: appointments.checkedInAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.doctorId, actor.doctorId),
        eq(appointments.status, "confirmed"),
        gte(appointments.startsAt, todayStart),
        lte(appointments.startsAt, todayEnd),
      )
    )
    .limit(1);

  if (!appt) {
    return NextResponse.json(
      { error: "Rendez-vous introuvable ou non éligible à l'enregistrement" },
      { status: 404 }
    );
  }

  const now = new Date();
  await db
    .update(appointments)
    .set({ checkedInAt: now, updatedAt: now })
    .where(eq(appointments.id, id));

  // Nudge connected dashboards (web + mobile, doctor + secretary) so the
  // waiting-room KPI refreshes immediately. The GET endpoint derives the
  // count from appointments + manual store, so the payload is informational.
  void broadcastSos(`waiting-room:${actor.doctorId}`, "waiting:update", {
    appointmentCheckedIn: id,
  });

  return NextResponse.json({ checkedInAt: now.toISOString() });
}

// DELETE /api/doctor/appointments/[id]/checkin — undo check-in
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [appt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, id),
        eq(appointments.doctorId, actor.doctorId),
        eq(appointments.status, "confirmed"),
        gte(appointments.startsAt, todayStart),
        lte(appointments.startsAt, todayEnd),
      )
    )
    .limit(1);

  if (!appt) {
    return NextResponse.json(
      { error: "Rendez-vous introuvable ou non éligible" },
      { status: 404 }
    );
  }

  const now = new Date();
  await db
    .update(appointments)
    .set({ checkedInAt: null, updatedAt: now })
    .where(eq(appointments.id, id));

  void broadcastSos(`waiting-room:${actor.doctorId}`, "waiting:update", {
    appointmentUncheckedIn: id,
  });

  return NextResponse.json({ checkedInAt: null });
}
