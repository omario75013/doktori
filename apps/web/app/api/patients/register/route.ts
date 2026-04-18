import { NextResponse } from "next/server";
import { db, patients } from "@doktori/db";
import { formatPhone } from "@doktori/shared";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { sign } from "jsonwebtoken";

function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-()]{8,20}$/.test(phone);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { name, email, phone, password } = body as Record<string, string>;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Le nom est requis (minimum 2 caractères)" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || !isValidPhone(phone)) {
    return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = formatPhone(phone);

  // Check email uniqueness
  const [existingByEmail] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.email, normalizedEmail))
    .limit(1);

  if (existingByEmail) {
    return NextResponse.json({ error: "Cette adresse email est déjà utilisée" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  // Check if patient already exists by phone (OTP-only account)
  const [existingByPhone] = await db
    .select()
    .from(patients)
    .where(eq(patients.phone, normalizedPhone))
    .limit(1);

  let patient;

  if (existingByPhone) {
    // Upgrade existing OTP account with email credentials
    [patient] = await db
      .update(patients)
      .set({
        name: existingByPhone.name || name.trim(),
        email: normalizedEmail,
        passwordHash,
        authMethod: "both",
      })
      .where(eq(patients.id, existingByPhone.id))
      .returning();
  } else {
    // Create new patient account
    [patient] = await db
      .insert(patients)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        authMethod: "email",
      })
      .returning();
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
