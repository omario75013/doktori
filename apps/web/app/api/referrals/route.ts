import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, referrals, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const referred = await db
    .select({
      id: referrals.id,
      status: referrals.status,
      createdAt: referrals.createdAt,
      validatedAt: referrals.validatedAt,
      referredName: doctors.name,
      referredEmail: doctors.email,
    })
    .from(referrals)
    .innerJoin(doctors, eq(referrals.referredId, doctors.id))
    .where(eq(referrals.referrerId, session.user.id))
    .orderBy(referrals.createdAt);

  return NextResponse.json(referred);
}
