import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, consultationNotes, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const user = await requireAuth(req);
  if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const doctorId = user.role === "doctor" ? user.id : user.doctorId;

  const { appointmentId } = await params;

  const [appt] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, doctorId)))
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
