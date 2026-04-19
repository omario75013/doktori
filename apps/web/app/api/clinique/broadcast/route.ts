import { NextRequest, NextResponse } from "next/server";
import {
  db,
  clinicDoctors,
  appointments,
  patients,
  clinics,
} from "@doktori/db";
import { eq, and, gte, lt, inArray, ne } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { sendSMS } from "@/lib/sms";

type BroadcastBody = {
  message?: string;
  targetDate?: string; // YYYY-MM-DD, defaults to this week
};

/** Returns Monday and Sunday of the current week (UTC) */
function thisWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun…6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

const SMS_BROADCAST_LIMIT = 500;

export async function POST(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: BroadcastBody;
  try {
    body = (await req.json()) as BroadcastBody;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { message, targetDate } = body;

  if (!message || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Le message est requis" },
      { status: 400 }
    );
  }

  if (message.length > 320) {
    return NextResponse.json(
      { error: "Le message ne peut pas dépasser 320 caractères" },
      { status: 400 }
    );
  }

  // Determine date bounds
  let rangeStart: Date;
  let rangeEnd: Date;

  if (targetDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return NextResponse.json(
        { error: "targetDate invalide, format attendu: YYYY-MM-DD" },
        { status: 400 }
      );
    }
    rangeStart = new Date(`${targetDate}T00:00:00.000Z`);
    rangeEnd = new Date(`${targetDate}T23:59:59.999Z`);
  } else {
    const bounds = thisWeekBounds();
    rangeStart = bounds.start;
    rangeEnd = bounds.end;
  }

  // Get all doctors for this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const doctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (doctorIds.length === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      skipped: 0,
      message: "Aucun médecin dans la clinique",
    });
  }

  // Fetch upcoming confirmed appointments in the date range
  const apptRows = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        inArray(appointments.doctorId, doctorIds),
        ne(appointments.status, "cancelled"),
        ne(appointments.status, "completed"),
        gte(appointments.startsAt, rangeStart),
        lt(appointments.startsAt, rangeEnd)
      )
    );

  // Deduplicate by patient phone (send once per patient even if multiple RDVs)
  const uniquePhones = new Set<string>();
  const recipients: { appointmentId: string; phone: string }[] = [];

  for (const row of apptRows) {
    if (!uniquePhones.has(row.patientPhone)) {
      uniquePhones.add(row.patientPhone);
      recipients.push({ appointmentId: row.id, phone: row.patientPhone });
    }
  }

  // Enforce broadcast limit
  if (recipients.length > SMS_BROADCAST_LIMIT) {
    return NextResponse.json(
      {
        error: `Trop de destinataires (${recipients.length}). Limite: ${SMS_BROADCAST_LIMIT} par diffusion.`,
      },
      { status: 429 }
    );
  }

  // Check clinic SMS quota (use clinicId as the "doctorId" key for quota)
  // Clinics use their own quota tracked separately; for now we allow if under limit
  // and log the sends

  let sent = 0;
  let skipped = 0;

  // Send SMS concurrently in batches of 10 to avoid overloading the provider
  const BATCH_SIZE = 10;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((r) =>
        sendSMS(r.phone, message.trim(), r.appointmentId)
      )
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.success) {
        sent++;
      } else {
        skipped++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    skipped,
    total: recipients.length,
  });
}
