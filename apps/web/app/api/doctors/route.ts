import { NextRequest, NextResponse } from "next/server";
import { db, doctors, subscriptions } from "@doktori/db";
import { doctorRegistrationSchema } from "@doktori/validation";
import { generateSlug } from "@doktori/shared";
import { hash } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { geocodeAddress } from "@/lib/geocode";
import { sendEmail } from "@/lib/email";
import { buildDoctorWelcomeEmail, buildDoctorEmailVerificationEmail } from "@/emails/templates";
import { createAdminNotification } from "@/lib/admin-notifications";
import { dispatchWebhook } from "@/lib/webhooks";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`doctors:register:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = doctorRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
  }

  const slug = generateSlug(parsed.data.name, parsed.data.specialty, parsed.data.city);
  const passwordHash = await hash(parsed.data.password, 12);

  // Geocode the cabinet address so "médecins près de moi" returns accurate distances.
  // If Nominatim is down or the address can't be resolved, we store null and the Meili
  // sync route falls back to the city centroid.
  const geo = await geocodeAddress(`${parsed.data.address}, ${parsed.data.city}, Tunisie`);

  const emailVerificationToken = crypto.randomBytes(32).toString("hex");

  const [doctor] = await db
    .insert(doctors)
    .values({
      name: parsed.data.name,
      slug,
      email,
      passwordHash,
      phone: parsed.data.phone,
      specialty: parsed.data.specialty,
      city: parsed.data.city,
      address: parsed.data.address,
      consultationFee: parsed.data.consultationFee ? parsed.data.consultationFee * 1000 : null,
      bio: parsed.data.bio,
      latitude: geo ? String(geo.lat) : null,
      longitude: geo ? String(geo.lng) : null,
      emailVerificationToken,
    })
    .returning({ id: doctors.id, slug: doctors.slug });

  // Create 2-month free trial subscription
  const trialEnd = new Date();
  trialEnd.setMonth(trialEnd.getMonth() + 2);

  await db.insert(subscriptions).values({
    doctorId: doctor.id,
    plan: "premium",
    status: "trial",
    priceMillimes: 0,
    billingCycle: "monthly",
    paymentProvider: "trial",
    startsAt: new Date(),
    endsAt: trialEnd,
  });

  // Store CGU acceptance timestamp if provided
  if (parsed.data.cguAccepted) {
    await db.execute(sql`UPDATE doctors SET cgu_accepted_at = NOW() WHERE id = ${doctor.id}`);
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";

  // Notify admin + dispatch webhook (fire-and-forget)
  createAdminNotification({
    type: "new_doctor",
    title: "Nouveau médecin inscrit",
    message: parsed.data.name,
    link: "/admin/medecins",
  }).catch(console.error);
  dispatchWebhook("doctor.registered", {
    doctorId: doctor.id,
    email,
    name: parsed.data.name,
  }).catch(console.error);

  // Trigger Meilisearch re-sync so the new doctor appears in patient search results
  // immediately after registration (fire-and-forget, non-blocking).
  fetch(`${baseUrl}/api/search/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  }).catch((err) => console.error("[search-sync] post-registration sync failed:", err));

  // Send verification email (fire-and-forget)
  const verificationUrl = `${baseUrl}/api/doctors/verify-email?token=${emailVerificationToken}`;
  const verificationEmail = buildDoctorEmailVerificationEmail({
    doctorName: parsed.data.name,
    verificationUrl,
  });
  sendEmail({
    to: email,
    subject: verificationEmail.subject,
    html: verificationEmail.html,
  }).catch(console.error);

  // Send welcome email (fire-and-forget)
  sendEmail({
    to: email,
    subject: "Bienvenue sur Doktori — votre essai gratuit est activé !",
    html: buildDoctorWelcomeEmail({
      doctorName: parsed.data.name,
      trialEndDate: trialEnd.toLocaleDateString("fr-TN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    }),
  }).catch(console.error);

  return NextResponse.json({ id: doctor.id, slug: doctor.slug }, { status: 201 });
}
