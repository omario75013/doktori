import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  await db
    .update(secretaries)
    .set({ lastActiveAt: new Date() })
    .where(eq(secretaries.id, session.user.id));
  return NextResponse.json({ ok: true });
}
