import { NextRequest, NextResponse } from "next/server";
import { db, labs } from "@doktori/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

// Public registration for medical labs / radiology centres. The new row is
// created with `verification_status='pending'` — the lab CANNOT log in until
// an admin approves it via /admin/laboratoires.
const labRegistrationSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().regex(/^(\+216|0)?[2-9]\d{7}$/, "Numéro de téléphone tunisien invalide"),
  address: z.string().min(5),
  city: z.string().min(1),
  services: z.array(z.string()).default([]),
  accreditations: z.array(z.string()).optional().default([]),
});

function slugifyLab(name: string, city: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  return `${normalize(name)}-${normalize(city)}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`labs:register:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const parsed = labRegistrationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();

    const [existing] = await db.select().from(labs).where(eq(labs.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    let slug = slugifyLab(parsed.data.name, parsed.data.city);
    const [slugExists] = await db.select({ id: labs.id }).from(labs).where(eq(labs.slug, slug)).limit(1);
    if (slugExists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const passwordHash = await hash(parsed.data.password, 12);

    const [lab] = await db
      .insert(labs)
      .values({
        name: parsed.data.name,
        slug,
        email,
        passwordHash,
        phone: parsed.data.phone,
        address: parsed.data.address,
        city: parsed.data.city,
        services: parsed.data.services,
        accreditations: parsed.data.accreditations,
        verificationStatus: "pending",
      })
      .returning({ id: labs.id, slug: labs.slug });

    return NextResponse.json(
      { id: lab.id, slug: lab.slug, pending: true },
      { status: 201 }
    );
  } catch (e) {
    console.error("[POST /api/labs/register]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
