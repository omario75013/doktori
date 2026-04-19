import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, teleconsultations, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });

    // Verify the appointment belongs to this doctor
    const [appt] = await db.select().from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, session.user.id)))
      .limit(1);

    if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

    // Check if teleconsult already exists
    const [existing] = await db.select().from(teleconsultations)
      .where(eq(teleconsultations.appointmentId, appointmentId))
      .limit(1);

    if (existing) return NextResponse.json(existing);

    // Generate unique room name: doktori-<appointmentId-short>-<random>
    const roomSuffix = randomBytes(6).toString("hex");
    const roomName = `doktori-${appointmentId.slice(0, 8)}-${roomSuffix}`;

    const [created] = await db.insert(teleconsultations).values({
      appointmentId,
      roomName,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api//teleconsult/create]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
