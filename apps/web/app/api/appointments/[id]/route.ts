import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const [appt] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      patientId: appointments.patientId,
    })
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
    .limit(1);

  if (!appt) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  return NextResponse.json(appt);
}
