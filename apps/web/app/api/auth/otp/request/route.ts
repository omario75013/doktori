import { NextResponse } from "next/server";
import { db, otpCodes } from "@doktori/db";
import { phoneOtpRequestSchema } from "@doktori/validation";
import { formatPhone } from "@doktori/shared";
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

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpCodes).values({ phone, code, expiresAt });

  console.log(`[OTP-DEV] ${phone}: ${code}`); // TODO: send via SMS in Task 10
  return NextResponse.json({ success: true, message: "Code envoyé" });
}
