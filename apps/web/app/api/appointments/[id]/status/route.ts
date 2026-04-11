import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const [updated] = await db
    .update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  return NextResponse.json(updated);
}
