import { NextRequest, NextResponse } from "next/server";
import {
  db,
  clinicDoctors,
  doctors,
  doctorSchedules,
  appointments,
  patients,
} from "@doktori/db";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

type SlotStatus = "free" | "booked" | "off";

type Slot = {
  time: string; // "HH:MM"
  status: SlotStatus;
  patientName?: string;
  appointmentId?: string;
};

type DoctorPlan = {
  id: string;
  name: string;
  specialty: string;
  slots: Slot[];
};

/** Generate HH:MM strings from 08:00 to 18:00 in 30-minute increments */
const GRID_HOURS: string[] = [];
for (let h = 8; h < 18; h++) {
  GRID_HOURS.push(`${String(h).padStart(2, "0")}:00`);
  GRID_HOURS.push(`${String(h).padStart(2, "0")}:30`);
}

function timeStrToMinutes(t: string): number {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + (mm ?? 0);
}

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: "Paramètre ?date=YYYY-MM-DD requis" },
      { status: 400 }
    );
  }

  const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateParam}T23:59:59.999Z`);
  const [, , dayStr] = dateParam.split("-");
  const dateObj = new Date(dayStart);
  const dayOfWeek = dateObj.getUTCDay();

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

  // 3. Fetch schedules for the given day
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

  // 4. Fetch appointments for the given day
  const appointmentRows = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      patientName: patients.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        inArray(appointments.doctorId, doctorIds),
        gte(appointments.startsAt, dayStart),
        lt(appointments.startsAt, dayEnd)
      )
    );

  // 5. Build lookup maps
  const scheduleByDoctor = new Map<
    string,
    { startTime: string; endTime: string; slotDuration: number }
  >();
  for (const s of scheduleRows) {
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
    {
      id: string;
      startsAt: Date;
      endsAt: Date;
      status: string;
      patientName: string;
    }[]
  >();
  for (const appt of appointmentRows) {
    if (!apptsByDoctor.has(appt.doctorId)) {
      apptsByDoctor.set(appt.doctorId, []);
    }
    apptsByDoctor.get(appt.doctorId)!.push({
      id: appt.id,
      startsAt: new Date(appt.startsAt),
      endsAt: new Date(appt.endsAt),
      status: appt.status,
      patientName: appt.patientName,
    });
  }

  // 6. Build slots for each doctor
  const result: DoctorPlan[] = doctorRows.map((doctor) => {
    const schedule = scheduleByDoctor.get(doctor.id);
    const todayAppts = apptsByDoctor.get(doctor.id) ?? [];

    const slots: Slot[] = GRID_HOURS.map((timeLabel) => {
      const slotMinutes = timeStrToMinutes(timeLabel);

      // Doctor has no schedule for this day → off
      if (!schedule) {
        return { time: timeLabel, status: "off" };
      }

      const schStartMin = timeStrToMinutes(schedule.startTime);
      const schEndMin = timeStrToMinutes(schedule.endTime);

      // Outside working hours
      if (slotMinutes < schStartMin || slotMinutes >= schEndMin) {
        return { time: timeLabel, status: "off" };
      }

      // Check if any appointment overlaps this 30-min grid cell
      const slotEndMinutes = slotMinutes + 30;
      const overlapping = todayAppts.find((appt) => {
        if (appt.status === "cancelled") return false;
        const apptStartMin =
          appt.startsAt.getUTCHours() * 60 + appt.startsAt.getUTCMinutes();
        const apptEndMin =
          appt.endsAt.getUTCHours() * 60 + appt.endsAt.getUTCMinutes();
        return apptStartMin < slotEndMinutes && apptEndMin > slotMinutes;
      });

      if (overlapping) {
        return {
          time: timeLabel,
          status: "booked",
          patientName: overlapping.patientName,
          appointmentId: overlapping.id,
        };
      }

      return { time: timeLabel, status: "free" };
    });

    return {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      slots,
    };
  });

  return NextResponse.json({ doctors: result });
}
