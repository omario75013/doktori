import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, otpCodes, patients } from "@doktori/db";
import { formatPhone } from "@doktori/shared";
import { sendSMS } from "@/lib/sms";
import { and, eq, gt, ne } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

const schema = z.object({
  phone: z
    .string()
    .trim()
    .min(8)
    .max(20),
});

export async function POST(req: NextRequest) {
  const payload = getPatientFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
  }

  const phone = formatPhone(parsed.data.phone);

  // Same number — nothing to do
  const [me] = await db
    .select({ phone: patients.phone })
    .from(patients)
    .where(eq(patients.id, payload.id))
    .limit(1);

  if (me?.phone === phone) {
    return NextResponse.json(
      { error: "Ce numéro est déjà associé à votre compte" },
      { status: 400 },
    );
  }

  // ⚠️ Warning: phone already used by another patient
  const [taken] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.phone, phone), ne(patients.id, payload.id)))
    .limit(1);

  if (taken) {
    return NextResponse.json(
      {
        error: "PHONE_ALREADY_USED",
        message:
          "Ce numéro est déjà utilisé par un autre compte Doktori. Veuillez utiliser un numéro différent ou contacter le support si c'est bien le vôtre.",
      },
      { status: 409 },
    );
  }

  // Rate limit: max 3 OTP requests per 15 min for this phone
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recent = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, fifteenMinAgo)));

  if (recent.length >= 3) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 },
    );
  }

  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(otpCodes).values({ phone, code, expiresAt });

  await sendSMS(
    phone,
    `Doktori: Votre code de vérification pour changer de numéro est ${code}. Valable 5 minutes.`,
  );

  return NextResponse.json({ ok: true });
}
