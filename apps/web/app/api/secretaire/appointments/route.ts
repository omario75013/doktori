import { NextResponse } from "next/server";
import { requireSecretary } from "@/lib/secretary-auth";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";

// GET /api/secretaire/appointments
// Returns all appointments for the secretary's doctor (last 100, desc)
export async function GET() {
  const secretary = await requireSecretary();
  if (secretary instanceof NextResponse) return secretary;

  const results = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      patientName: patients.name,
      patientPhone: patients.phone,
      patientId: appointments.patientId,
      patientNoShowCount: patients.noShowCount,
      patientLastMinuteCancelCount: patients.lastMinuteCancelCount,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(eq(appointments.doctorId, secretary.doctorId))
    .orderBy(desc(appointments.startsAt))
    .limit(100);

  return NextResponse.json(results);
}

// PATCH /api/secretaire/appointments — update appointment status
// Body: { id, status }
export async function PATCH(req: Request) {
  const secretary = await requireSecretary();
  if (secretary instanceof NextResponse) return secretary;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { id, status } = body as Record<string, unknown>;
  if (typeof id !== "string" || typeof status !== "string") {
    return NextResponse.json({ error: "id et status sont obligatoires" }, { status: 400 });
  }

  const ALLOWED = ["confirmed", "completed", "no_show", "cancelled"];
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Ensure appointment belongs to this secretary's doctor
  const [appt] = await db
    .select({ id: appointments.id, status: appointments.status })
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, secretary.doctorId)))
    .limit(1);

  if (!appt) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  const updateValues: Partial<typeof appointments.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };
  if (status === "confirmed") updateValues.confirmedAt = new Date();
  if (status === "cancelled") updateValues.cancelledAt = new Date();

  const [updated] = await db
    .update(appointments)
    .set(updateValues)
    .where(eq(appointments.id, id))
    .returning();

  return NextResponse.json(updated);
}
