import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  db,
  patientReferrals,
  patients,
  doctors,
  doctorNotifications,
} from "@doktori/db";
import { and, eq, or, desc } from "drizzle-orm";

const createSchema = z.object({
  toDoctorId: z.string().uuid(),
  patientId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
  shareMedicalRecord: z.boolean().optional().default(false),
  suggestedAppointmentAt: z.string().datetime().optional().nullable(),
  notesForReceivingDoctor: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
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

  // Verify the doctor owns (has at least one appointment with) the patient
  const [patient] = await db
    .select({ id: patients.id, name: patients.name, email: patients.email, phone: patients.phone })
    .from(patients)
    .where(eq(patients.id, parsed.data.patientId))
    .limit(1);
  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const [target] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.id, parsed.data.toDoctorId))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  const token = randomBytes(24).toString("hex");

  const [created] = await db
    .insert(patientReferrals)
    .values({
      fromDoctorId: session.user.id,
      toDoctorId: parsed.data.toDoctorId,
      patientId: parsed.data.patientId,
      reason: parsed.data.reason,
      shareMedicalRecord: parsed.data.shareMedicalRecord,
      patientConsentStatus: parsed.data.shareMedicalRecord ? "pending" : "granted",
      patientConsentToken: parsed.data.shareMedicalRecord ? token : null,
      suggestedAppointmentAt: parsed.data.suggestedAppointmentAt
        ? new Date(parsed.data.suggestedAppointmentAt)
        : null,
      notesForReceivingDoctor: parsed.data.notesForReceivingDoctor ?? null,
      status: "pending",
    })
    .returning();

  await db.insert(doctorNotifications).values({
    doctorId: parsed.data.toDoctorId,
    type: "referral_received",
    payload: { referralId: created.id, fromDoctorId: session.user.id },
  });

  return NextResponse.json({ ok: true, referral: created }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: patientReferrals.id,
      fromDoctorId: patientReferrals.fromDoctorId,
      toDoctorId: patientReferrals.toDoctorId,
      patientId: patientReferrals.patientId,
      reason: patientReferrals.reason,
      shareMedicalRecord: patientReferrals.shareMedicalRecord,
      patientConsentStatus: patientReferrals.patientConsentStatus,
      suggestedAppointmentAt: patientReferrals.suggestedAppointmentAt,
      status: patientReferrals.status,
      createdAt: patientReferrals.createdAt,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(patientReferrals)
    .innerJoin(patients, eq(patients.id, patientReferrals.patientId))
    .where(
      or(
        eq(patientReferrals.fromDoctorId, session.user.id),
        eq(patientReferrals.toDoctorId, session.user.id)
      )
    )
    .orderBy(desc(patientReferrals.createdAt));

  // Mask sensitive fields if share_medical_record=true but consent NOT granted
  const masked = rows.map((r) => {
    if (
      r.toDoctorId === session.user.id &&
      r.shareMedicalRecord &&
      r.patientConsentStatus !== "granted"
    ) {
      return {
        ...r,
        patientName: r.patientName.split(" ")[0] + " ***",
      };
    }
    return r;
  });

  return NextResponse.json(masked);
}
