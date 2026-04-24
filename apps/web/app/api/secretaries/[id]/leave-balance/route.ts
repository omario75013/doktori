import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, secretaries } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { computeLeaveBalance } from "@/lib/leave-balance";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  // Authorization: doctor owner, or the secretary themselves
  if (session.user.role === "doctor") {
    const [row] = await db
      .select({ id: secretaries.id })
      .from(secretaries)
      .where(and(eq(secretaries.id, id), eq(secretaries.doctorId, session.user.id)))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  } else if (session.user.role === "secretary") {
    if (session.user.id !== id) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  const balance = await computeLeaveBalance(id);
  if (!balance) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(balance);
}
