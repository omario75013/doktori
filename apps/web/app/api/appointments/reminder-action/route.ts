import { NextResponse } from "next/server";
import { db, appointments, patients, doctors } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { verifyReminderToken } from "@/lib/reminder-token";
import { sendEmail } from "@/lib/email";
import { cancellationConfirmation, cancellationDoctor } from "@/emails/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const LAST_MINUTE_MS = 2 * 60 * 60 * 1000;

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

  if (updated && updated.startsAt.getTime() - now.getTime() < LAST_MINUTE_MS) {
    await db
      .update(patients)
      .set({ lastMinuteCancelCount: sql`${patients.lastMinuteCancelCount} + 1` })
      .where(eq(patients.id, updated.patientId));
  }

  // Send cancellation emails (best-effort)
  if (updated) {
    try {
      const [patient] = await db.select().from(patients).where(eq(patients.id, updated.patientId)).limit(1);
      const [doctor] = await db.select().from(doctors).where(eq(doctors.id, updated.doctorId)).limit(1);
      const dateStr = format(updated.startsAt, "EEEE d MMMM", { locale: fr });
      const timeStr = format(updated.startsAt, "HH:mm");

      if (patient?.email && doctor) {
        const email = cancellationConfirmation({
          patientName: patient.name,
          doctorName: doctor.name,
          date: dateStr,
          rebookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn"}/rdv/${doctor.slug}`,
        });
        await sendEmail({ to: patient.email, ...email, appointmentId: updated.id });
      }
      if (doctor?.email && patient) {
        const email = cancellationDoctor({
          doctorName: doctor.name,
          patientName: patient.name,
          date: dateStr,
          time: timeStr,
        });
        await sendEmail({ to: doctor.email, ...email, appointmentId: updated.id });
      }
    } catch {}
  }

  return NextResponse.json({ status: updated.status });
}
