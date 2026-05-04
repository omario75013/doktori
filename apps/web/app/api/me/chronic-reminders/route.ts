import { NextRequest, NextResponse } from "next/server";
import { db, chronicTreatmentReminders, chronicDiseaseContent } from "@doktori/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [reminders, diseases] = await Promise.all([
    db
      .select()
      .from(chronicTreatmentReminders)
      .where(eq(chronicTreatmentReminders.patientId, patient.id))
      .orderBy(desc(chronicTreatmentReminders.createdAt)),
    db
      .select({
        slug: chronicDiseaseContent.slug,
        nameFr: chronicDiseaseContent.nameFr,
        nameAr: chronicDiseaseContent.nameAr,
        reminderDefaultFreqHours: chronicDiseaseContent.reminderDefaultFreqHours,
        displayOrder: chronicDiseaseContent.displayOrder,
      })
      .from(chronicDiseaseContent)
      .orderBy(chronicDiseaseContent.displayOrder),
  ]);

  return NextResponse.json({ reminders, diseases });
}

const createSchema = z
  .object({
    diseaseSlug: z.string().trim().max(60).optional().nullable(),
    medicationName: z.string().trim().min(1).max(160),
    dosage: z.string().trim().max(80).optional().nullable(),
    frequencyHours: z.number().int().min(1).max(24 * 30),
    channel: z.enum(["sms", "email", "push"]).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const next = new Date(Date.now() + parsed.data.frequencyHours * 3600 * 1000);

  const [row] = await db
    .insert(chronicTreatmentReminders)
    .values({
      patientId: patient.id,
      diseaseSlug: parsed.data.diseaseSlug ?? null,
      medicationName: parsed.data.medicationName,
      dosage: parsed.data.dosage ?? null,
      frequencyHours: parsed.data.frequencyHours,
      nextReminderAt: next,
      notificationChannel: parsed.data.channel ?? "sms",
      active: true,
    })
    .returning();

  return NextResponse.json({ reminder: row }, { status: 201 });
}
