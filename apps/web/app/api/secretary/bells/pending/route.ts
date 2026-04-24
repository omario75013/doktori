import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctorBells, secretaries } from "@doktori/db";
import { and, desc, eq, isNull, or, gte } from "drizzle-orm";

// Returns unacknowledged bells addressed to this secretary (or to "all")
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [sec] = await db
    .select({ doctorId: secretaries.doctorId })
    .from(secretaries)
    .where(eq(secretaries.id, session.user.id))
    .limit(1);
  if (!sec) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const since = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes window

  const rows = await db
    .select()
    .from(doctorBells)
    .where(
      and(
        eq(doctorBells.doctorId, sec.doctorId),
        isNull(doctorBells.acknowledgedAt),
        gte(doctorBells.createdAt, since),
        or(isNull(doctorBells.secretaryId), eq(doctorBells.secretaryId, session.user.id))
      )
    )
    .orderBy(desc(doctorBells.createdAt));

  return NextResponse.json(rows);
}
