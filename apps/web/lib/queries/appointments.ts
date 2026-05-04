import {
  db,
  appointments,
  doctorSchedules,
  patients,
  appointmentTypePractices,
  doctorDaysOff,
} from "@doktori/db";
import { eq, and, gte, lte, not, inArray, isNull, or, sql } from "drizzle-orm";

// A patient cancellation is flagged as "last-minute" when it lands within this
// window before the appointment start. Bumped into patients.lastMinuteCancelCount.
const LAST_MINUTE_MS = 2 * 60 * 60 * 1000; // 2 hours

export type Slot = {
  startTime: string;
  endTime: string;
  available: boolean;
  practiceId: string;
};

export async function getAvailableSlots(
  doctorId: string,
  date: string,
  durationOverride?: number,
  practiceId?: string,
  appointmentTypeId?: string,
): Promise<Slot[]> {
  const dayOfWeek = new Date(date).getDay();

  // Resolve allowed practices for this motif (if provided). The booking flow
  // should only surface cabinets where the motif is actually offered.
  let allowedPracticeIds: string[] | null = null;
  if (appointmentTypeId) {
    const rows = await db
      .select({ practiceId: appointmentTypePractices.practiceId })
      .from(appointmentTypePractices)
      .where(eq(appointmentTypePractices.appointmentTypeId, appointmentTypeId));
    allowedPracticeIds = rows.map((r) => r.practiceId);
    // If caller also specified a practiceId, intersect
    if (practiceId && !allowedPracticeIds.includes(practiceId)) {
      return [];
    }
    if (practiceId) allowedPracticeIds = [practiceId];
    if (allowedPracticeIds.length === 0) return [];
  } else if (practiceId) {
    allowedPracticeIds = [practiceId];
  }

  const schedules = await db
    .select()
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.dayOfWeek, dayOfWeek),
        eq(doctorSchedules.isActive, true),
        allowedPracticeIds && allowedPracticeIds.length > 0
          ? inArray(doctorSchedules.practiceId, allowedPracticeIds)
          : undefined,
      )
    );

  if (schedules.length === 0) return [];

  // Check if the requested date falls within any declared days-off
  const daysOff = await db
    .select({ id: doctorDaysOff.id })
    .from(doctorDaysOff)
    .where(
      and(
        eq(doctorDaysOff.doctorId, doctorId),
        lte(doctorDaysOff.startDate, date),
        gte(doctorDaysOff.endDate, date),
        or(
          isNull(doctorDaysOff.practiceId),
          allowedPracticeIds && allowedPracticeIds.length > 0
            ? inArray(doctorDaysOff.practiceId, allowedPracticeIds)
            : undefined
        )
      )
    )
    .limit(1);

  if (daysOff.length > 0) return [];

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const booked = await db
    .select({
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      practiceId: appointments.practiceId,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, dayStart),
        lte(appointments.startsAt, dayEnd),
        not(inArray(appointments.status, ["cancelled", "no_show"])),
      )
    );

  const slots: Slot[] = [];

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

      // A slot is taken if any appointment at the same cabinet overlaps.
      // Appointments at a DIFFERENT cabinet don't block this cabinet's slots.
      const isBooked = booked.some(
        (b) =>
          slotStartDate < b.endsAt &&
          slotEndDate > b.startsAt &&
          b.practiceId === sched.practiceId
      );

      const isPast = slotStartDate < new Date();

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        available: !isBooked && !isPast,
        practiceId: sched.practiceId,
      });
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
  type?: string;
}) {
  return await db.transaction(async (tx) => {
    // Conflicts are scoped per cabinet: a doctor can have overlapping slots
    // at two different cabinets (booked by different secretaries, etc.).
    const conflicts = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, data.doctorId),
          data.practiceId ? eq(appointments.practiceId, data.practiceId) : undefined,
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
        type: data.type || "cabinet",
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
