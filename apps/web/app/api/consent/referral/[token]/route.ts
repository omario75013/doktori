import { NextResponse } from "next/server";
import { z } from "zod";
import { db, patientReferrals, doctors, doctorNotifications } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const [row] = await db
    .select({
      id: patientReferrals.id,
      reason: patientReferrals.reason,
      status: patientReferrals.patientConsentStatus,
      fromDoctorId: patientReferrals.fromDoctorId,
      toDoctorId: patientReferrals.toDoctorId,
    })
    .from(patientReferrals)
    .where(eq(patientReferrals.patientConsentToken, token))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });

  const [fromDoctor] = await db
    .select({ name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(eq(doctors.id, row.fromDoctorId))
    .limit(1);
  const [toDoctor] = await db
    .select({ name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(eq(doctors.id, row.toDoctorId))
    .limit(1);

  return NextResponse.json({
    id: row.id,
    reason: row.reason,
    consentStatus: row.status,
    fromDoctor,
    toDoctor,
  });
}

const postSchema = z.object({ consent: z.enum(["granted", "denied"]) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "consent requis" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(patientReferrals)
    .where(eq(patientReferrals.patientConsentToken, token))
    .limit(1);
  if (!row) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  if (row.patientConsentStatus !== "pending") {
    return NextResponse.json({ error: "Déjà traité" }, { status: 409 });
  }

  await db
    .update(patientReferrals)
    .set({ patientConsentStatus: parsed.data.consent, updatedAt: new Date() })
    .where(eq(patientReferrals.id, row.id));

  // Notify both doctors
  await db.insert(doctorNotifications).values([
    {
      doctorId: row.fromDoctorId,
      type: "referral_consent",
      payload: { referralId: row.id, consent: parsed.data.consent },
    },
    {
      doctorId: row.toDoctorId,
      type: "referral_consent",
      payload: { referralId: row.id, consent: parsed.data.consent },
    },
  ]);

  return NextResponse.json({ ok: true, consent: parsed.data.consent });
}
