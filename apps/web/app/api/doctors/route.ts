import { NextResponse } from "next/server";
import { db, doctors, subscriptions } from "@doktori/db";
import { doctorRegistrationSchema } from "@doktori/validation";
import { generateSlug } from "@doktori/shared";
import { hash } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { geocodeAddress } from "@/lib/geocode";
import { sendEmail } from "@/lib/email";
import { buildDoctorWelcomeEmail } from "@/emails/templates";

export async function POST(req: Request) {
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
