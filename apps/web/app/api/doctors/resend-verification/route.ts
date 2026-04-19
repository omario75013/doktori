import { NextRequest, NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { buildDoctorEmailVerificationEmail } from "@/emails/templates";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Rate limit: 3 resend attempts per email per hour
  const rl = rateLimit(
    `doctors:resend-verification:${(email as string).toLowerCase()}`,
    3,
    60 * 60 * 1000
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const [doctor] = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      emailVerified: doctors.emailVerified,
    })
    .from(doctors)
    .where(eq(doctors.email, email.toLowerCase()))
    .limit(1);

  // Always return 200 to avoid email enumeration
  if (!doctor || doctor.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await db
    .update(doctors)
    .set({ emailVerificationToken: token })
    .where(eq(doctors.id, doctor.id));

  const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
  const verificationUrl = `${baseUrl}/api/doctors/verify-email?token=${token}`;
  const verificationEmail = buildDoctorEmailVerificationEmail({
    doctorName: doctor.name,
    verificationUrl,
  });

  await sendEmail({
    to: email.toLowerCase(),
    subject: verificationEmail.subject,
    html: verificationEmail.html,
  });

  return NextResponse.json({ ok: true });
}
