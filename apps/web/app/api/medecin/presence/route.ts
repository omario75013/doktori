import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await db
    .update(doctors)
    .set({ lastActiveAt: new Date() })
    .where(eq(doctors.id, session.user.id));

  return new NextResponse(null, { status: 204 });
}
