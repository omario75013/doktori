import { NextResponse } from "next/server";
import { z } from "zod";
import { db, patients, patientCommunicationOptout } from "@doktori/db";
import { eq } from "drizzle-orm";

const BodySchema = z.object({
  phone: z.string().min(6),
  reason: z.string().max(100).optional(),
});

// ── POST /api/sms/optout ──────────────────────────────────────────────────────
// Public endpoint — no auth required. Patient enters their phone to opt out.

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Numéro de téléphone requis" }, { status: 400 });
  }

  const { phone, reason } = parsed.data;

  // Find patient by phone
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.phone, phone.trim()))
    .limit(1);

  if (!patient) {
    // Return success anyway to avoid phone enumeration
    return NextResponse.json({ success: true });
  }

  // Upsert opt-out row
  await db
    .insert(patientCommunicationOptout)
    .values({
      patientId: patient.id,
      reason: reason ?? "web_optout",
    })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
}
