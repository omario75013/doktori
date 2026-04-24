import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

/**
 * POST /api/auth/doctor-register
 * Registers a new doctor with verificationStatus = "pending".
 * Does NOT issue a JWT — the account must be verified by the team first.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const specialty = typeof body.specialty === "string" ? body.specialty.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const diplomaYear =
    typeof body.diplomaYear === "number"
      ? body.diplomaYear
      : body.diplomaYear != null
        ? Number(body.diplomaYear)
        : undefined;

  // Validate required fields
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Prénom et nom sont requis" }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Numéro de téléphone requis" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères" },
      { status: 400 }
    );
  }
  if (!specialty) {
    return NextResponse.json({ error: "Spécialité requise" }, { status: 400 });
  }
  if (!city) {
    return NextResponse.json({ error: "Ville requise" }, { status: 400 });
  }
  if (diplomaYear !== undefined && (diplomaYear < 1950 || diplomaYear > 2030)) {
    return NextResponse.json(
      { error: "Année du diplôme invalide (1950–2030)" },
      { status: 400 }
    );
  }

  // Check for email conflict
  const [existing] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cette adresse email" },
      { status: 409 }
    );
  }

  // Hash password
  const passwordHash = await hash(password, 10);

  // Generate unique slug: firstname-lastname-XXXX
  const baseSlug = `${firstName} ${lastName}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  const slug = `${baseSlug}-${suffix}`;

  const name = `${firstName} ${lastName}`;

  await db.insert(doctors).values({
    name,
    slug,
    email,
    passwordHash,
    phone,
    specialty,
    city,
    address: "",
    consultationMode: "cabinet",
    verificationStatus: "pending",
    ...(diplomaYear !== undefined
      ? { yearsOfExperience: new Date().getFullYear() - diplomaYear }
      : {}),
  });

  return NextResponse.json({
    ok: true,
    message:
      "Votre demande a été enregistrée. Notre équipe vous contactera sous 48h.",
  });
}
