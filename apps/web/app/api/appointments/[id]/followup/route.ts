import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments, waitlist } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { addWeeks, format } from "date-fns";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const weeks = Number(body.weeks);

  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 104) {
    return NextResponse.json({ error: "Délai invalide (1 à 104 semaines)" }, { status: 400 });
  }

  const [appt] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, session.user.id)))
    .limit(1);

  if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

  const preferredDate = format(addWeeks(new Date(), weeks), "yyyy-MM-dd");

  const [entry] = await db
    .insert(waitlist)
    .values({
      doctorId: appt.doctorId,
      patientId: appt.patientId,
      preferredDate,
      source: "follow_up",
      appointmentId: appt.id,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
