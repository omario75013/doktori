import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctorReferralCodes } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = session.user.id;

  const [existing] = await db
    .select()
    .from(doctorReferralCodes)
    .where(eq(doctorReferralCodes.doctorId, doctorId))
    .limit(1);

  if (existing) {
    return NextResponse.json({ code: existing.code });
  }

  // Generate an 8-char uppercase alphanumeric code
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();

  const [created] = await db
    .insert(doctorReferralCodes)
    .values({ doctorId, code })
    .returning();

  return NextResponse.json({ code: created.code });
}
