import { NextRequest, NextResponse } from "next/server";
import { db, labs } from "@doktori/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

// ── GET /api/clinique/labs ──────────────────────────────────────────────────
// List this clinic's in-house labs (clinic_id = this clinic).

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const rows = await db
    .select({
      id: labs.id,
      name: labs.name,
      kind: labs.kind,
      email: labs.email,
      phone: labs.phone,
      address: labs.address,
      city: labs.city,
      services: labs.services,
      verificationStatus: labs.verificationStatus,
      createdAt: labs.createdAt,
    })
    .from(labs)
    .where(and(isNotNull(labs.clinicId), eq(labs.clinicId, clinic.id)))
    .orderBy(labs.createdAt);

  return NextResponse.json({ labs: rows });
}

// ── POST /api/clinique/labs ─────────────────────────────────────────────────
// Create an in-house lab for this clinic.
// Body: { name, kind: 'lab'|'radiology', email, phone, address, city, services? }

export async function POST(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: {
    name?: string;
    kind?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    services?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { name, kind, email, phone, address, city, services } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: "Email requis" }, { status: 400 });
  if (!phone?.trim()) return NextResponse.json({ error: "Téléphone requis" }, { status: 400 });
  if (!address?.trim()) return NextResponse.json({ error: "Adresse requise" }, { status: 400 });
  if (!city?.trim()) return NextResponse.json({ error: "Ville requise" }, { status: 400 });
  if (kind !== "lab" && kind !== "radiology") {
    return NextResponse.json({ error: "Type invalide (lab ou radiology)" }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await db
    .select({ id: labs.id })
    .from(labs)
    .where(eq(labs.email, email.trim().toLowerCase()));
  if (existing.length > 0) {
    return NextResponse.json({ error: "Un labo avec cet email existe déjà" }, { status: 409 });
  }

  // Generate slug from name + random suffix
  const slugBase = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const [newLab] = await db
    .insert(labs)
    .values({
      name: name.trim(),
      slug,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      passwordHash,
      verificationStatus: "verified", // clinic vouches for its own labs
      clinicId: clinic.id,
      kind: kind as "lab" | "radiology",
      services: Array.isArray(services) ? services : [],
    })
    .returning({ id: labs.id, name: labs.name });

  // TODO: send tempPassword to lab email via mailer
  console.log(
    `[clinic-labs] Created in-house lab "${newLab?.name}" (id=${newLab?.id}) for clinic ${clinic.id}. ` +
    `Temp password: ${tempPassword} → TODO: send email to ${email}`
  );

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "lab_create",
    targetType: "lab",
    targetId: newLab?.id,
    metadata: { name: name.trim(), kind, email: email.trim().toLowerCase() },
  });

  return NextResponse.json({ labId: newLab?.id, tempPasswordSent: true }, { status: 201 });
}
