import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, doctorReferralCodes } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";

/**
 * Returns the current doctor's unique referral code, generating one if missing.
 * Code format: DR-XXXXXX (uppercase hex).
 */
export async function GET(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const [existing] = await db
    .select()
    .from(doctorReferralCodes)
    .where(eq(doctorReferralCodes.doctorId, doctor.id))
    .limit(1);

  if (existing) {
    const code = existing.code.startsWith("DR-")
      ? existing.code
      : `DR-${existing.code}`;
    return NextResponse.json({ code, doctorId: doctor.id });
  }

  const code = `DR-${randomBytes(3).toString("hex").toUpperCase()}`;

  const [created] = await db
    .insert(doctorReferralCodes)
    .values({ doctorId: doctor.id, code })
    .returning();

  return NextResponse.json({ code: created.code, doctorId: doctor.id });
}
