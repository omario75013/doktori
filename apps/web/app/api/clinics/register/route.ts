import { NextRequest, NextResponse } from "next/server";
import { db, clinics } from "@doktori/db";
import { z } from "zod";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const clinicRegistrationSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  phone: z.string().regex(/^(\+216|0)?[2-9]\d{7}$/, "Numéro de téléphone tunisien invalide"),
  address: z.string().min(5, "Adresse trop courte"),
  city: z.string().min(1, "Veuillez sélectionner une ville"),
});

function slugifyClinic(name: string, city: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  return `${normalize(name)}-${normalize(city)}`;
}

function buildClinicWelcomeEmail(clinicName: string): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#0891B2,#134E4A);padding:32px;text-align:center;border-radius:16px 16px 0 0">
      <h1 style="color:white;margin:0;font-size:28px">Bienvenue sur Doktori !</h1>
    </div>
    <div style="padding:32px;background:white;border:1px solid #E6F4F1;border-radius:0 0 16px 16px">
      <p style="font-size:16px;color:#134E4A">Bonjour ${clinicName},</p>
      <p style="color:#5E7574">Votre espace clinique est prêt ! Vous pouvez maintenant gérer vos médecins et vos rendez-vous directement depuis votre tableau de bord.</p>
      <h3 style="color:#134E4A">Pour bien démarrer :</h3>
      <ol style="color:#5E7574;line-height:2">
        <li>Complétez le profil de votre clinique</li>
        <li>Ajoutez vos médecins</li>
        <li>Configurez les horaires et les salles</li>
        <li>Commencez à recevoir des rendez-vous</li>
      </ol>
      <a href="https://doktori.tn/clinique/dashboard" style="display:inline-block;background:#0891B2;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px">Accéder à mon espace</a>
    </div>
  </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`clinics:register:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = clinicRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const [existing] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    // Generate a unique slug; append random suffix if the base slug is taken
    let slug = slugifyClinic(parsed.data.name, parsed.data.city);
    const [slugExists] = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.slug, slug))
      .limit(1);

    if (slugExists) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const passwordHash = await hash(parsed.data.password, 12);

    const [clinic] = await db
      .insert(clinics)
      .values({
        name: parsed.data.name,
        slug,
        email,
        passwordHash,
        phone: parsed.data.phone,
        address: parsed.data.address,
        city: parsed.data.city,
        plan: "free",
      })
      .returning({ id: clinics.id, slug: clinics.slug });

    // Send welcome email (fire-and-forget)
    sendEmail({
      to: email,
      subject: "Bienvenue sur Doktori — votre espace clinique est prêt !",
      html: buildClinicWelcomeEmail(parsed.data.name),
    }).catch(console.error);

    return NextResponse.json({ id: clinic.id, slug: clinic.slug }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/clinics/register]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
