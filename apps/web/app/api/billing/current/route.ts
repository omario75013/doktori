import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, subscriptions } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const doctorId = user.role === "doctor" ? user.id : (user as { doctorId?: string }).doctorId;
  if (!doctorId) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });

  const [sub] = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.doctorId, doctorId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return NextResponse.json(sub || null);
}
