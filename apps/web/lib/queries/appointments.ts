import { db, appointments, doctorSchedules, patients } from "@doktori/db";
import { eq, and, gte, lte, not, inArray, sql } from "drizzle-orm";

// A patient cancellation is flagged as "last-minute" when it lands within this
// window before the appointment start. Bumped into patients.lastMinuteCancelCount.
const LAST_MINUTE_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function getAvailableSlots(
  doctorId: string,
  date: string,
  durationOverride?: number,
  practiceId?: string,
) {
  const dayOfWeek = new Date(date).getDay();

  const schedules = await db
    .select()
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.dayOfWeek, dayOfWeek),
        eq(doctorSchedules.isActive, true),
        practiceId ? eq(doctorSchedules.practiceId, practiceId) : undefined,
      )
    );

  if (schedules.length === 0) return [];

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const booked = await db
    .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, dayStart),
        lte(appointments.startsAt, dayEnd),
        not(inArray(appointments.status, ["cancelled", "no_show"])),
      )
    );

  const slots: Array<{ startTime: string; endTime: string; available: boolean }> = [];

  for (const sched of schedules) {
    const [startH, startM] = sched.startTime.split(":").map(Number);
    const endParts = sched.endTime.split(":").map(Number);
    const duration = durationOverride ?? sched.slotDuration;

    let current = startH * 60 + startM;
    const end = endParts[0] * 60 + endParts[1];

    while (current + duration <= end) {
      const slotStart = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
      const slotEnd = `${String(Math.floor((current + duration) / 60)).padStart(2, "0")}:${String((current + duration) % 60).padStart(2, "0")}`;

      const slotStartDate = new Date(`${date}T${slotStart}:00`);
      const slotEndDate = new Date(`${date}T${slotEnd}:00`);

      const isBooked = booked.some(
        (b) => slotStartDate < b.endsAt && slotEndDate > b.startsAt
      );

      const isPast = slotStartDate < new Date();

      slots.push({ startTime: slotStart, endTime: slotEnd, available: !isBooked && !isPast });
      current += duration;
    }
  }

  return slots;
}

export async function createAppointment(data: {
  doctorId: string;
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  reason?: string;
  appointmentTypeId?: string;
  dependentId?: string;
  practiceId?: string;
}) {
  return await db.transaction(async (tx) => {
    const conflicts = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, data.doctorId),
          not(inArray(appointments.status, ["cancelled", "no_show"])),
          lte(appointments.startsAt, data.endsAt),
          gte(appointments.endsAt, data.startsAt),
        )
      )
      .for("update")
      .limit(1);

    if (conflicts.length > 0) {
      throw new Error("Ce créneau n'est plus disponible");
    }

    const [appointment] = await tx
      .insert(appointments)
      .values({
        doctorId: data.doctorId,
        patientId: data.patientId,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        reason: data.reason,
        appointmentTypeId: data.appointmentTypeId,
        dependentId: data.dependentId,
        practiceId: data.practiceId,
        status: "confirmed",
      })
      .returning();

    return appointment;
  });
}

export async function cancelAppointment(appointmentId: string, patientId: string) {
  const now = new Date();
  const [updated] = await db
    .update(appointments)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.patientId, patientId),
        not(inArray(appointments.status, ["cancelled", "completed"])),
      )
    )
    .returning();

  if (updated && updated.startsAt.getTime() - now.getTime() < LAST_MINUTE_MS) {
    await db
      .update(patients)
      .set({ lastMinuteCancelCount: sql`${patients.lastMinuteCancelCount} + 1` })
      .where(eq(patients.id, patientId));
  }

  return updated ?? null;
}
