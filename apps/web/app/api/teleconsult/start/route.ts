import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, teleconsultations, appointments } from "@doktori/db";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(req: Request) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { appointmentId } = body as Record<string, unknown>;

  if (!appointmentId || typeof appointmentId !== "string") {
    return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });
  }

  // Verify appointment belongs to this doctor
  const [appt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.doctorId, doctor.id),
      )
    )
    .limit(1);

  if (!appt) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  // Mark started_at only if not already set (idempotent)
  const [updated] = await db
    .update(teleconsultations)
    .set({ startedAt: new Date() })
    .where(
      and(
        eq(teleconsultations.appointmentId, appointmentId),
        isNull(teleconsultations.startedAt),
      )
    )
    .returning({ startedAt: teleconsultations.startedAt });

  return NextResponse.json({ started: true, startedAt: updated?.startedAt ?? null });
}
