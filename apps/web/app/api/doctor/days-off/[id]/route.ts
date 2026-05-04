import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorDaysOff } from "@doktori/db";
import { and, eq } from "drizzle-orm";

// DELETE /api/doctor/days-off/[id] — remove a days-off period (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth || auth.role !== "doctor") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [deleted] = await db
    .delete(doctorDaysOff)
    .where(and(eq(doctorDaysOff.id, id), eq(doctorDaysOff.doctorId, auth.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Congé introuvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
