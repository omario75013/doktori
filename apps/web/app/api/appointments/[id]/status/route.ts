import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Load current row to detect transitions before we overwrite status
  const [current] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
    .limit(1);
  if (!current) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

  const now = new Date();

  const [updated] = await db
    .update(appointments)
    .set({ status, updatedAt: now })
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
    .returning();

  // Reliability counters — only bump on a true transition into the flagged state
  if (status === "no_show" && current.status !== "no_show") {
    await db
      .update(patients)
      .set({ noShowCount: sql`${patients.noShowCount} + 1` })
      .where(eq(patients.id, current.patientId));
  }

  return NextResponse.json(updated);
}
