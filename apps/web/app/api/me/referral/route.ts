import { NextRequest, NextResponse } from "next/server";
import { db, patientReferralCodes, patientReferralUsages } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit easily-confused chars

function generateCode(length = 8): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

async function ensureCode(patientId: string) {
  const [existing] = await db
    .select()
    .from(patientReferralCodes)
    .where(eq(patientReferralCodes.patientId, patientId))
    .limit(1);
  if (existing) return existing;

  // Generate a unique code (retry on collision; max 5 attempts)
  for (let i = 0; i < 5; i++) {
    const code = generateCode(8);
    try {
      const [created] = await db
        .insert(patientReferralCodes)
        .values({ patientId, code })
        .returning();
      return created;
    } catch (e) {
      // Likely unique constraint violation — try again
      if (i === 4) throw e;
    }
  }
  throw new Error("Could not generate unique referral code");
}

export async function GET(req: NextRequest) {
  const auth = getPatientFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const code = await ensureCode(auth.id);

  // Stats: friends joined (count of usages), rewards earned, RDV taken
  const [stats] = await db
    .select({
      friendsJoined: sql<number>`COUNT(*)::int`,
      rdvTaken: sql<number>`COUNT(${patientReferralUsages.appointmentId})::int`,
      rewardsEarned: sql<number>`COALESCE(SUM(CASE WHEN ${patientReferralUsages.rewardGranted} THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(patientReferralUsages)
    .where(eq(patientReferralUsages.referrerId, auth.id));

  return NextResponse.json({
    code: code.code,
    usesCount: code.usesCount,
    rewardsEarned: code.rewardsEarned,
    stats: stats ?? { friendsJoined: 0, rdvTaken: 0, rewardsEarned: 0 },
  });
}
