import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorConnections } from "@doktori/db";
import { and, eq } from "drizzle-orm";

// Requester cancels a pending invitation they sent. Only deletes if the row
// is still `pending` and the caller is the original requester. Accepted /
// blocked rows must be unfriended via a separate flow.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  const [deleted] = await db
    .delete(doctorConnections)
    .where(
      and(
        eq(doctorConnections.id, id),
        eq(doctorConnections.requesterId, user.id),
        eq(doctorConnections.status, "pending"),
      ),
    )
    .returning({ id: doctorConnections.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Invitation introuvable ou déjà traitée" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
