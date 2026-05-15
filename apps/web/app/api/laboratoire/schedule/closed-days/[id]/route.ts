import { NextRequest, NextResponse } from "next/server";
import { db, labClosedDays } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireLabContext, requireLabUser } from "@/lib/lab-auth";

// DELETE /api/laboratoire/schedule/closed-days/[id] (admin-only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let labId: string;
  const user = await requireLabUser();
  if (user instanceof NextResponse) {
    const ctx = await requireLabContext();
    if (ctx instanceof NextResponse) return ctx;
    labId = ctx.labId;
  } else {
    if (user.labUserRole !== "admin") {
      return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
    }
    labId = user.labId;
  }

  const [row] = await db
    .select({ id: labClosedDays.id })
    .from(labClosedDays)
    .where(and(eq(labClosedDays.id, id), eq(labClosedDays.labId, labId)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Fermeture introuvable" }, { status: 404 });
  }

  await db.delete(labClosedDays).where(eq(labClosedDays.id, id));
  return NextResponse.json({ ok: true });
}
