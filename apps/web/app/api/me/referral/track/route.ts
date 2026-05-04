import { NextRequest, NextResponse } from "next/server";
import { db, patientReferralCodes, patientReferralUsages } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function POST(req: NextRequest) {
  const auth = getPatientFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { referrerCode?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON requis" }, { status: 400 });
  }

  const referrerCode = (body.referrerCode || "").trim().toUpperCase();
  if (!referrerCode) {
    return NextResponse.json({ error: "referrerCode requis" }, { status: 400 });
  }

  // Lookup referrer
  const [refRow] = await db
    .select()
    .from(patientReferralCodes)
    .where(eq(patientReferralCodes.code, referrerCode))
    .limit(1);

  if (!refRow) {
    return NextResponse.json({ error: "Code introuvable" }, { status: 404 });
  }

  // Don't allow self-referral
  if (refRow.patientId === auth.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas utiliser votre propre code" }, { status: 400 });
  }

  // Check we haven't already tracked this pair
  const existing = await db
    .select({ id: patientReferralUsages.id })
    .from(patientReferralUsages)
    .where(eq(patientReferralUsages.referredId, auth.id))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ ok: true, alreadyTracked: true });
  }

  // Record the usage
  await db.insert(patientReferralUsages).values({
    referrerId: refRow.patientId,
    referredId: auth.id,
    rewardGranted: false,
  });

  // Bump the uses_count on the referrer's code
  await db
    .update(patientReferralCodes)
    .set({ usesCount: refRow.usesCount + 1 })
    .where(eq(patientReferralCodes.patientId, refRow.patientId));

  return NextResponse.json({ ok: true });
}
