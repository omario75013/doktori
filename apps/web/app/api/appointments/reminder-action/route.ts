import { NextResponse } from "next/server";
import { db, appointments } from "@doktori/db";
import { eq } from "drizzle-orm";
import { verifyReminderToken } from "@/lib/reminder-token";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = body?.token;
  const action = body?.action;

  if (typeof token !== "string" || (action !== "confirm" && action !== "cancel")) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const appointmentId = verifyReminderToken(token);
  if (!appointmentId) {
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 401 });
  }

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  if (appointment.status === "cancelled" || appointment.status === "completed") {
    return NextResponse.json({ error: "Ce rendez-vous ne peut plus être modifié", status: appointment.status }, { status: 409 });
  }

  if (appointment.startsAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Ce rendez-vous est déjà passé" }, { status: 409 });
  }

  const now = new Date();

  if (action === "confirm") {
    const [updated] = await db
      .update(appointments)
      .set({ status: "confirmed", confirmedAt: now, updatedAt: now })
      .where(eq(appointments.id, appointmentId))
      .returning();
    return NextResponse.json({ status: updated.status });
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(eq(appointments.id, appointmentId))
    .returning();
  return NextResponse.json({ status: updated.status });
}
