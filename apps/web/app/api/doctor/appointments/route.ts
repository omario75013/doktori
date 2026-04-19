import { NextResponse } from "next/server";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";
import { db, appointments, patients, doctorSchedules } from "@doktori/db";
import { eq } from "drizzle-orm";

// ─── POST /api/doctor/appointments ───────────────────────────────────────────
// Doctor (or secretary acting for a doctor) books an appointment directly for
// a specific patient. Appointment is created with status "confirmed" since it
// is doctor-initiated — no pending state needed.
//
// Body: { patientId, startsAt, endsAt?, type?, reason?, notes? }

export async function POST(req: Request) {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const {
    patientId,
    startsAt: startsAtRaw,
    endsAt: endsAtRaw,
    type = "cabinet",
    reason,
    notes,
  } = body as Record<string, unknown>;

  // Validate required fields
  if (typeof patientId !== "string" || patientId.trim().length === 0) {
    return NextResponse.json({ error: "patientId est obligatoire" }, { status: 400 });
  }
  if (typeof startsAtRaw !== "string" || startsAtRaw.trim().length === 0) {
    return NextResponse.json({ error: "startsAt est obligatoire" }, { status: 400 });
  }

  const startsAt = new Date(startsAtRaw);
  if (isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "startsAt est invalide" }, { status: 400 });
  }

  // Compute endsAt: if not provided, use the doctor's slot duration or 20 min default
  let endsAt: Date;
  if (typeof endsAtRaw === "string" && endsAtRaw.trim().length > 0) {
    endsAt = new Date(endsAtRaw);
    if (isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: "endsAt est invalide" }, { status: 400 });
    }
  } else {
    // Fetch the doctor's slot duration
    const [schedule] = await db
      .select({ slotDuration: doctorSchedules.slotDuration })
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, actor.doctorId))
      .limit(1);
    const slotMinutes = schedule?.slotDuration ?? 20;
    endsAt = new Date(startsAt.getTime() + slotMinutes * 60 * 1000);
  }

  // Verify the patient exists
  const [patient] = await db
    .select({ id: patients.id, isSuspended: patients.isSuspended })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  if (patient.isSuspended) {
    return NextResponse.json({ error: "Compte patient suspendu" }, { status: 403 });
  }

  const appointmentType =
    typeof type === "string" && ["cabinet", "teleconsult", "domicile"].includes(type)
      ? (type as "cabinet" | "teleconsult" | "domicile")
      : "cabinet";

  const [created] = await db
    .insert(appointments)
    .values({
      doctorId: actor.doctorId,
      patientId,
      startsAt,
      endsAt,
      status: "confirmed",
      type: appointmentType,
      reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      confirmedAt: new Date(),
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
