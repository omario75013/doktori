import { NextResponse } from "next/server";
import { eq, aliasedTable } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { db, referrals, doctors } from "@doktori/db";

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim() ?? "";

  const referrer = aliasedTable(doctors, "referrer");
  const referred = aliasedTable(doctors, "referred");

  const rows = await db
    .select({
      id: referrals.id,
      status: referrals.status,
      createdAt: referrals.createdAt,
      validatedAt: referrals.validatedAt,
      referrerId: referrals.referrerId,
      referredId: referrals.referredId,
      referrerName: referrer.name,
      referredName: referred.name,
    })
    .from(referrals)
    .innerJoin(referrer, eq(referrals.referrerId, referrer.id))
    .innerJoin(referred, eq(referrals.referredId, referred.id))
    .where(
      status && ["pending", "validated", "rewarded"].includes(status)
        ? eq(referrals.status, status)
        : undefined
    )
    .orderBy(referrals.createdAt);

  return NextResponse.json({
    referrals: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
    })),
  });
}
