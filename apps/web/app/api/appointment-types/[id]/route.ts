import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointmentTypes } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const [updated] = await db.update(appointmentTypes)
    .set({ isActive: false })
    .where(and(eq(appointmentTypes.id, id), eq(appointmentTypes.doctorId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Type introuvable" }, { status: 404 });
  return NextResponse.json({ success: true });
}
