import { NextRequest, NextResponse } from "next/server";
import { db, patient2fa } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { authenticator } from "otplib";
import { randomBytes } from "crypto";

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    randomBytes(4).toString("hex").toUpperCase()
  );
}

export async function POST(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : null;

  if (!code) {
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }

  const [record] = await db
    .select()
    .from(patient2fa)
    .where(eq(patient2fa.patientId, session.id))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Configuration 2FA introuvable. Lancez d'abord /setup." }, { status: 404 });
  }

  if (record.enabled) {
    return NextResponse.json({ error: "La 2FA est déjà activée" }, { status: 409 });
  }

  const isValid = authenticator.verify({ token: code, secret: record.totpSecret });
  if (!isValid) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 });
  }

  const backupCodes = generateBackupCodes();

  await db
    .update(patient2fa)
    .set({
      enabled: true,
      backupCodes,
      enabledAt: new Date(),
    })
    .where(eq(patient2fa.patientId, session.id));

  return NextResponse.json({ success: true, backupCodes });
}
