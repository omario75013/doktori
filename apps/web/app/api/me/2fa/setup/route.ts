import { NextRequest, NextResponse } from "next/server";
import { db, patient2fa, patients } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { authenticator } from "otplib";

// GET /api/me/2fa/setup — get 2FA status
export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [record] = await db
    .select({ enabled: patient2fa.enabled })
    .from(patient2fa)
    .where(eq(patient2fa.patientId, session.id))
    .limit(1);

  return NextResponse.json({ enabled: record?.enabled ?? false });
}

// POST /api/me/2fa/setup — initiate TOTP setup, returns QR code URL + secret
export async function POST(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Get patient name for the TOTP label
  const [patient] = await db
    .select({ name: patients.name, phone: patients.phone })
    .from(patients)
    .where(eq(patients.id, session.id))
    .limit(1);

  if (!patient) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Check if 2FA is already enabled
  const [existing] = await db
    .select()
    .from(patient2fa)
    .where(eq(patient2fa.patientId, session.id))
    .limit(1);

  if (existing?.enabled) {
    return NextResponse.json({ error: "La 2FA est déjà activée" }, { status: 409 });
  }

  // Generate a new TOTP secret
  const secret = authenticator.generateSecret();
  const label = patient.name ?? patient.phone;
  const issuer = "Doktori";

  const otpAuthUrl = authenticator.keyuri(label, issuer, secret);

  // Store the secret (not enabled yet — enabled only after verification)
  await db
    .insert(patient2fa)
    .values({
      patientId: session.id,
      totpSecret: secret,
      enabled: false,
      backupCodes: [],
    })
    .onConflictDoUpdate({
      target: patient2fa.patientId,
      set: {
        totpSecret: secret,
        enabled: false,
        backupCodes: sql`'[]'::jsonb`,
        enabledAt: sql`NULL`,
      },
    });

  // Generate QR code URL via Google Charts API (no package needed)
  const qrApiUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;

  return NextResponse.json({ secret, qrDataUrl: qrApiUrl, otpAuthUrl });
}
