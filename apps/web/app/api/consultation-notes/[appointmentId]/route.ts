import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, consultationNotes, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { appointmentId } = await params;

  // Verify the doctor owns this appointment
  const [appt] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, session.user.id)))
    .limit(1);

  if (!appt) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  const [note] = await db
    .select()
    .from(consultationNotes)
    .where(eq(consultationNotes.appointmentId, appointmentId))
    .limit(1);

  if (!note) {
    return NextResponse.json({ error: "Aucune note de consultation" }, { status: 404 });
  }

  return NextResponse.json(note);
}
