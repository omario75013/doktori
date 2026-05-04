import { NextResponse } from "next/server";
import { db, doctorReferrals, doctors } from "@doktori/db";
import { aliasedTable, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Admin: list all doctor-to-doctor referrals.
 */
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const referrer = aliasedTable(doctors, "ref_referrer");
  const referred = aliasedTable(doctors, "ref_referred");

  const rows = await db
    .select({
      id: doctorReferrals.id,
      status: doctorReferrals.status,
      commissionPct: doctorReferrals.commissionPct,
      rewardsEarnedTnd: doctorReferrals.rewardsEarnedTnd,
      validatedAt: doctorReferrals.validatedAt,
      rejectionReason: doctorReferrals.rejectionReason,
      createdAt: doctorReferrals.createdAt,
      referrerId: doctorReferrals.referrerDoctorId,
      referredId: doctorReferrals.referredDoctorId,
      referrerName: referrer.name,
      referrerEmail: referrer.email,
      referredName: referred.name,
      referredEmail: referred.email,
    })
    .from(doctorReferrals)
    .innerJoin(referrer, eq(doctorReferrals.referrerDoctorId, referrer.id))
    .innerJoin(referred, eq(doctorReferrals.referredDoctorId, referred.id))
    .orderBy(doctorReferrals.createdAt);

  return NextResponse.json({
    referrals: rows.map((r) => ({
      ...r,
      validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      commissionPct: Number(r.commissionPct),
      rewardsEarnedTnd: Number(r.rewardsEarnedTnd),
    })),
  });
}
