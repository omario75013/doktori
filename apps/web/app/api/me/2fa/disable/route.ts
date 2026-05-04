import { NextRequest, NextResponse } from "next/server";
import { db, patient2fa, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { compare } from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : null;

  if (!password) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  // Verify current password
  const [patient] = await db
    .select({ passwordHash: patients.passwordHash })
    .from(patients)
    .where(eq(patients.id, session.id))
    .limit(1);

  if (!patient?.passwordHash) {
    return NextResponse.json({ error: "Compte sans mot de passe (connexion OTP uniquement)" }, { status: 400 });
  }

  const valid = await compare(password, patient.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 403 });
  }

  const [record] = await db
    .select()
    .from(patient2fa)
    .where(eq(patient2fa.patientId, session.id))
    .limit(1);

  if (!record?.enabled) {
    return NextResponse.json({ error: "La 2FA n'est pas activée" }, { status: 404 });
  }

  await db
    .update(patient2fa)
    .set({ enabled: false, backupCodes: [], enabledAt: null })
    .where(eq(patient2fa.patientId, session.id));

  return NextResponse.json({ success: true });
}
