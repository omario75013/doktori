import { NextRequest, NextResponse } from "next/server";
import { db, doctorReferrals, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireDoctor } from "@/lib/doctor-auth";

const trackSchema = z
  .object({
    referrerCode: z.string().trim().min(1).max(80),
  })
  .strict();

/**
 * Called by the doctor signup flow right after a doctor account is created,
 * passing the referrer's id (or DR-XXXXXX code) captured from ?ref= URL param.
 * Creates a pending doctor_referrals row.
 */
export async function POST(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée" }, { status: 400 });
  }

  const ref = parsed.data.referrerCode.trim();

  // Resolve referrer: either a UUID (doctor id) or a DR-XXXXXX code
  let referrerId: string | null = null;
  if (/^[0-9a-f-]{36}$/i.test(ref)) {
    const [d] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.id, ref)).limit(1);
    if (d) referrerId = d.id;
  } else {
    // future: lookup doctor_referral_codes by code
    const { doctorReferralCodes } = await import("@doktori/db");
    const [c] = await db
      .select({ doctorId: doctorReferralCodes.doctorId })
      .from(doctorReferralCodes)
      .where(eq(doctorReferralCodes.code, ref))
      .limit(1);
    if (c) referrerId = c.doctorId;
  }

  if (!referrerId) {
    return NextResponse.json({ error: "Code parrain inconnu" }, { status: 404 });
  }
  if (referrerId === doctor.id) {
    return NextResponse.json({ error: "Auto-parrainage impossible" }, { status: 400 });
  }

  try {
    await db.insert(doctorReferrals).values({
      referrerDoctorId: referrerId,
      referredDoctorId: doctor.id,
      status: "pending",
    });
  } catch (e) {
    // Already exists → idempotent
    return NextResponse.json({ success: true, alreadyExists: true });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
