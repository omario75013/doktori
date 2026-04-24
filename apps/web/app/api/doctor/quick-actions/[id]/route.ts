import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorQuickActions } from "@doktori/db";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  await db
    .delete(doctorQuickActions)
    .where(and(eq(doctorQuickActions.id, id), eq(doctorQuickActions.doctorId, user.id)));
  return NextResponse.json({ ok: true });
}
