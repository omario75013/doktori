import { NextRequest, NextResponse } from "next/server";
import { db, patientNotificationPrefs } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const DEFAULT_PREFS = {
  emailAppointments: true,
  emailMarketing: false,
  emailNews: false,
  smsAppointments: true,
  smsReminders: true,
  smsOtp: true,
  pushAppointments: true,
  pushMessages: true,
  reminderOffsetHours: 24,
};

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [row] = await db
    .select()
    .from(patientNotificationPrefs)
    .where(eq(patientNotificationPrefs.patientId, patient.id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ ...DEFAULT_PREFS, patientId: patient.id });
  }
  return NextResponse.json(row);
}

const patchSchema = z.object({
  emailAppointments: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  emailNews: z.boolean().optional(),
  smsAppointments: z.boolean().optional(),
  smsReminders: z.boolean().optional(),
  smsOtp: z.boolean().optional(),
  pushAppointments: z.boolean().optional(),
  pushMessages: z.boolean().optional(),
  reminderOffsetHours: z.number().int().min(1).max(168).optional(),
});

export async function PUT(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const now = new Date();

  // Upsert: insert with defaults if missing, otherwise update
  await db
    .insert(patientNotificationPrefs)
    .values({
      patientId: patient.id,
      ...DEFAULT_PREFS,
      ...parsed.data,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: patientNotificationPrefs.patientId,
      set: { ...parsed.data, updatedAt: now },
    });

  const [row] = await db
    .select()
    .from(patientNotificationPrefs)
    .where(eq(patientNotificationPrefs.patientId, patient.id))
    .limit(1);

  return NextResponse.json(row);
}
