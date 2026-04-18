import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { buildDoctorEmailVerificationEmail } from "@/emails/templates";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
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
