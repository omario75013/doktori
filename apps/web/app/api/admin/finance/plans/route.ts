import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, subscriptionPlans } from "@doktori/db";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const plans = await db
    .select()
    .from(subscriptionPlans)
    .orderBy(asc(subscriptionPlans.displayOrder));

  return NextResponse.json({ plans });
}
