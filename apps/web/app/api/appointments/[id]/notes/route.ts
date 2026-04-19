import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const { notes } = await req.json();

    if (typeof notes !== "string" || notes.length > 2000) {
      return NextResponse.json({ error: "Notes invalides" }, { status: 400 });
    }

    const [updated] = await db
      .update(appointments)
      .set({ notes, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api//appointments/[id]/notes]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
