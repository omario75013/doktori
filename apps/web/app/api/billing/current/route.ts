import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, subscriptions } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [sub] = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.doctorId, session.user.id), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return NextResponse.json(sub || null);
}
