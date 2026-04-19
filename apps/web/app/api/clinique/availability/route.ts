import { NextResponse } from "next/server";
import {
  db,
  clinicDoctors,
  doctors,
  doctorSchedules,
  appointments,
} from "@doktori/db";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

function getTodayBounds(): { start: Date; end: Date; dayOfWeek: number } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  // JS: 0=Sun…6=Sat — matches doctorSchedules.dayOfWeek
  const dayOfWeek = now.getUTCDay();
  return { start, end, dayOfWeek };
}

/**
 * Parse a "HH:MM:SS" time string and combine with a base date (UTC midnight)
 * to produce a full UTC Date for that time on the same day.
 */
function timeToDate(baseUTCMidnight: Date, timeStr: string): Date {
  const [hh, mm] = timeStr.split(":").map(Number);
  const d = new Date(baseUTCMidnight);
  d.setUTCHours(hh, mm ?? 0, 0, 0);
  return d;
}

/**
 * Given a schedule (startTime, endTime, slotDuration) and a set of booked
 * intervals on that day, compute:
 * - totalSlots: total possible booking slots
 * - bookedSlots: how many are already booked
 * - nextFreeSlot: first slot that has no overlapping booked appointment
 */
function computeSlots(
  dayStart: Date,
  scheduleStart: string,
  scheduleEnd: string,
  slotDurationMinutes: number,
  bookedAppointments: { startsAt: Date; endsAt: Date }[]
): { totalSlots: number; bookedSlots: number; nextFreeSlot: Date | null } {
  const schStart = timeToDate(dayStart, scheduleStart);
  const schEnd = timeToDate(dayStart, scheduleEnd);

  const totalMs = schEnd.getTime() - schStart.getTime();
  if (totalMs <= 0) return { totalSlots: 0, bookedSlots: 0, nextFreeSlot: null };

  const slotMs = slotDurationMinutes * 60_000;
  const totalSlots = Math.floor(totalMs / slotMs);

  const now = new Date();
  let bookedSlots = 0;
  let nextFreeSlot: Date | null = null;

  for (let i = 0; i < totalSlots; i++) {
    const slotStart = new Date(schStart.getTime() + i * slotMs);
    const slotEnd = new Date(slotStart.getTime() + slotMs);

    const isBooked = bookedAppointments.some(
      (appt) =>
        appt.startsAt < slotEnd && appt.endsAt > slotStart
    );

    if (isBooked) {
      bookedSlots++;
    } else if (nextFreeSlot === null && slotStart >= now) {
      nextFreeSlot = slotStart;
    }
  }

  return { totalSlots, bookedSlots, nextFreeSlot };
}

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { start: todayStart, end: todayEnd, dayOfWeek } = getTodayBounds();
  const now = new Date();

  // 1. Get all doctors for this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (doctorIds.length === 0) {
    return NextResponse.json({ doctors: [] });
  }

  // 2. Fetch doctor info
  const doctorRows = await db
    .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(inArray(doctors.id, doctorIds));

  // 3. Fetch today's schedules for these doctors
  const scheduleRows = await db
    .select({
      doctorId: doctorSchedules.doctorId,
      startTime: doctorSchedules.startTime,
      endTime: doctorSchedules.endTime,
      slotDuration: doctorSchedules.slotDuration,
    })
    .from(doctorSchedules)
    .where(
      and(
        inArray(doctorSchedules.doctorId, doctorIds),
        eq(doctorSchedules.dayOfWeek, dayOfWeek),
        eq(doctorSchedules.isActive, true)
      )
    );

  // 4. Fetch today's appointments
  const appointmentRows = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        inArray(appointments.doctorId, doctorIds),
        gte(appointments.startsAt, todayStart),
        lt(appointments.startsAt, todayEnd)
      )
    );

  // 5. Build per-doctor map
  const scheduleByDoctor = new Map<
    string,
    { startTime: string; endTime: string; slotDuration: number }
  >();
  for (const s of scheduleRows) {
    // Take the first active schedule for the day (doctors typically have one)
    if (!scheduleByDoctor.has(s.doctorId)) {
      scheduleByDoctor.set(s.doctorId, {
        startTime: s.startTime,
        endTime: s.endTime,
        slotDuration: s.slotDuration,
      });
    }
  }

  const apptsByDoctor = new Map<
    string,
    { startsAt: Date; endsAt: Date; status: string }[]
  >();
  for (const appt of appointmentRows) {
    if (!apptsByDoctor.has(appt.doctorId)) {
      apptsByDoctor.set(appt.doctorId, []);
    }
    apptsByDoctor.get(appt.doctorId)!.push({
      startsAt: new Date(appt.startsAt),
      endsAt: new Date(appt.endsAt),
      status: appt.status,
    });
  }

  // 6. Build response
  const result = doctorRows.map((doctor) => {
    const schedule = scheduleByDoctor.get(doctor.id);
    const todayAppts = apptsByDoctor.get(doctor.id) ?? [];

    // isOnline: has a confirmed appointment right now
    const isOnline = todayAppts.some(
      (a) =>
        a.status === "confirmed" &&
        new Date(a.startsAt) <= now &&
        new Date(a.endsAt) > now
    );

    if (!schedule) {
      return {
        doctorId: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        todaySlots: 0,
        todaySlotsBooked: 0,
        nextAvailableSlot: null,
        isOnline,
      };
    }

    const { totalSlots, bookedSlots, nextFreeSlot } = computeSlots(
      todayStart,
      schedule.startTime,
      schedule.endTime,
      schedule.slotDuration,
      todayAppts
    );

    return {
      doctorId: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      todaySlots: totalSlots,
      todaySlotsBooked: bookedSlots,
      nextAvailableSlot: nextFreeSlot ? nextFreeSlot.toISOString() : null,
      isOnline,
    };
  });

  return NextResponse.json({ doctors: result });
}
