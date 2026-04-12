import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const suffix = randomBytes(2).toString("hex"); // 4 hex chars
  return `${base}-${suffix}`;
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json()) as Record<string, unknown>;

  const { name, email, phone, specialty, city, address, bio, consultationFee, password } = body;

  // Validate required fields
  const fieldErrors: Record<string, string> = {};

  if (!name || typeof name !== "string" || !name.trim()) {
    fieldErrors.name = "Le nom est requis.";
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    fieldErrors.email = "Un email valide est requis.";
  }
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    fieldErrors.phone = "Le téléphone est requis.";
  }
  if (!specialty || typeof specialty !== "string" || !specialty.trim()) {
    fieldErrors.specialty = "La spécialité est requise.";
  }
  if (!city || typeof city !== "string" || !city.trim()) {
    fieldErrors.city = "La ville est requise.";
  }
  if (!address || typeof address !== "string" || !address.trim()) {
    fieldErrors.address = "L'adresse est requise.";
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    fieldErrors.password = "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Données invalides.", fieldErrors }, { status: 422 });
  }

  const passwordHash = await bcrypt.hash(password as string, 10);
  const slug = generateSlug(name as string);

  let newDoctor: typeof doctors.$inferSelect;
  try {
    const [inserted] = await db
      .insert(doctors)
      .values({
        name: (name as string).trim(),
        slug,
        email: (email as string).trim().toLowerCase(),
        passwordHash,
        phone: (phone as string).trim(),
        specialty: (specialty as string).trim(),
        city: (city as string).trim(),
        address: (address as string).trim(),
        bio: bio && typeof bio === "string" && bio.trim() ? bio.trim() : null,
        consultationFee:
          typeof consultationFee === "number" && consultationFee >= 0
            ? consultationFee
            : null,
        isActive: true,
      })
      .returning();

    newDoctor = inserted;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("doctors_email_idx") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "Données invalides.", fieldErrors: { email: "Cet email est déjà utilisé." } },
        { status: 409 }
      );
    }
    console.error("[doctors.create]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "doctors.create",
    resourceType: "doctors",
    resourceId: newDoctor.id,
    before: null,
    after: {
      name: newDoctor.name,
      email: newDoctor.email,
      specialty: newDoctor.specialty,
      city: newDoctor.city,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ doctor: newDoctor }, { status: 201 });
}
