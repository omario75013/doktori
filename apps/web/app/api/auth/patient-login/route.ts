import { NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { compare } from "bcryptjs";
import { db, patients } from "@doktori/db";
import { eq, or } from "drizzle-orm";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { identifier?: string; password?: string }
    | null;

  const identifier = body?.identifier?.trim();
  const password = body?.password;

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "identifier et password requis" },
      { status: 400 }
    );
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(or(eq(patients.phone, identifier), eq(patients.email, identifier)))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect" }, { status: 401 });
  }

  if (!patient.passwordHash) {
    return NextResponse.json({ error: "Ce compte n'a pas de mot de passe configuré" }, { status: 401 });
  }

  const valid = await compare(password, patient.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect" }, { status: 401 });
  }

  const token = sign(
    { id: patient.id, phone: patient.phone, role: "patient" },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "30d" }
  );

  return NextResponse.json({
    token,
    user: {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email ?? null,
      role: "patient",
    },
  });
}
