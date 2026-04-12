import { NextResponse } from "next/server";
import { db, otpCodes, patients } from "@doktori/db";
import { phoneOtpVerifySchema } from "@doktori/validation";
import { formatPhone } from "@doktori/shared";
import { eq, and, gt } from "drizzle-orm";
import { sign } from "jsonwebtoken";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = phoneOtpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const phone = formatPhone(parsed.data.phone);

  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.code, parsed.data.code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!otp) {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });
  }

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));

  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.phone, phone))
    .limit(1);

  if (!patient) {
    [patient] = await db.insert(patients).values({ name: "", phone }).returning();
  }

  const token = sign(
    { id: patient.id, phone: patient.phone, role: "patient" },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "7d" }
  );

  return NextResponse.json({ token, patient: { id: patient.id, phone: patient.phone } });
}
