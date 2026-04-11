import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      isActive: secretaries.isActive,
      createdAt: secretaries.createdAt,
    })
    .from(secretaries)
    .where(eq(secretaries.doctorId, session.user.id))
    .orderBy(secretaries.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { name, email, password } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "L'email est invalide" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  try {
    const [secretary] = await db
      .insert(secretaries)
      .values({
        doctorId: session.user.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
      })
      .returning({
        id: secretaries.id,
        name: secretaries.name,
        email: secretaries.email,
        isActive: secretaries.isActive,
        createdAt: secretaries.createdAt,
      });

    return NextResponse.json(secretary, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("secretaries_email_idx")) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
