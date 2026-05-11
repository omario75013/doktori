import { NextRequest, NextResponse } from "next/server";
import { db, otpCodes, patients } from "@doktori/db";
import { formatPhone } from "@doktori/shared";
import { and, eq, gt, ne } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const schema = z.object({
  phone: z.string().trim().min(8).max(20),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const payload = getPatientFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Code ou téléphone invalide" }, { status: 400 });
  }

  const phone = formatPhone(parsed.data.phone);

  // Race-condition safety: re-check that nobody else claimed this number
  // between the request-code and verify steps.
  const [taken] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.phone, phone), ne(patients.id, payload.id)))
    .limit(1);

  if (taken) {
    return NextResponse.json(
      {
        error: "PHONE_ALREADY_USED",
        message: "Ce numéro vient d'être pris par un autre compte.",
      },
      { status: 409 },
    );
  }

  // Find a valid, unused OTP for this phone+code
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.code, parsed.data.code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!otp) {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
  }

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
  await db.update(patients).set({ phone }).where(eq(patients.id, payload.id));

  return NextResponse.json({ ok: true, phone });
}
