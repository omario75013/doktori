import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { db, otpCodes } from "@doktori/db";
import { phoneOtpRequestSchema } from "@doktori/validation";
import { formatPhone } from "@doktori/shared";
import { sendSMS } from "@/lib/sms";
import { eq, and, gt } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = phoneOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const phone = formatPhone(parsed.data.phone);

  // Rate limiting: max 3 OTP requests per 15 minutes per phone
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recentOtps = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, fifteenMinAgo)));

  if (recentOtps.length >= 3) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 }
    );
  }

  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpCodes).values({ phone, code, expiresAt });

  // Send via SMS (dev mode logs to console, prod sends via Twilio)
  await sendSMS(phone, `Doktori: Votre code de vérification est ${code}. Valable 5 minutes.`);
  return NextResponse.json({ success: true, message: "Code envoyé" });
}
