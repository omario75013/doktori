import { NextResponse } from "next/server";
import { db, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { email, password } = body as Record<string, string>;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.email, normalizedEmail))
    .limit(1);

  // Generic error to avoid email enumeration
  if (!patient || !patient.passwordHash) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  const valid = await compare(password, patient.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
  }

  if (patient.isSuspended) {
    return NextResponse.json({ error: "Votre compte a été suspendu" }, { status: 403 });
  }

  const token = sign(
    { id: patient.id, phone: patient.phone, role: "patient" },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "7d" }
  );

  return NextResponse.json({
    token,
    patient: { id: patient.id, name: patient.name, email: patient.email },
  });
}
