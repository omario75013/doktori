import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, prescriptions, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { appointmentId, content } = await req.json();
  if (!appointmentId || typeof content !== "string" || content.length < 3 || content.length > 5000) {
    return NextResponse.json({ error: "Contenu invalide (3-5000 caractères)" }, { status: 400 });
  }

  // Verify doctor owns the appointment
  const [appt] = await db.select().from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, session.user.id)))
    .limit(1);

  if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

  const verificationToken = randomBytes(32).toString("hex");

  const [created] = await db.insert(prescriptions).values({
    appointmentId,
    doctorId: session.user.id,
    patientId: appt.patientId,
    content,
    verificationToken,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
