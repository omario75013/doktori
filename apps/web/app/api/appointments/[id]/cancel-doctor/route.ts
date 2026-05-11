import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, appointments, patients, doctors } from "@doktori/db";
import { eq, and, inArray, not } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { cancellationConfirmation, cancellationDoctor } from "@/emails/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notifyWaitlistPatients } from "@/lib/waitlist-notify";
import { notifyPatientAppointmentChange } from "@/lib/notify-patient-rdv";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const doctor = await requireDoctor();
    if (doctor instanceof NextResponse) return doctor;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason: string = typeof body.reason === "string" ? body.reason.trim() : "";

    // Load appointment + verify doctor ownership
    const [appt] = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        startsAt: appointments.startsAt,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.doctorId, doctor.id),
        ),
      )
      .limit(1);

    if (!appt) {
      return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
    }

    if (!["pending", "confirmed"].includes(appt.status)) {
      return NextResponse.json(
        { error: "Ce rendez-vous ne peut pas être annulé" },
        { status: 409 },
      );
    }

    const now = new Date();

    // Cancel the appointment
    const [updated] = await db
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: now,
        notes: reason || null,
        updatedAt: now,
      })
      .where(
        and(
          eq(appointments.id, id),
          eq(appointments.doctorId, doctor.id),
          not(inArray(appointments.status, ["cancelled", "completed"])),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Échec de l'annulation" }, { status: 409 });
    }

    // Notify waitlist patients that a slot freed up (fire-and-forget)
    void notifyWaitlistPatients(appt.doctorId, appt.startsAt);

    // In-app notification to the patient (separate from the SMS/email below).
    void notifyPatientAppointmentChange(id, "cancelled", { reason: reason || null });

    // Fetch patient and doctor info for notifications
    const [patient] = await db
      .select({ name: patients.name, phone: patients.phone, email: patients.email })
      .from(patients)
      .where(eq(patients.id, appt.patientId))
      .limit(1);

    const [doctorRow] = await db
      .select({ name: doctors.name, email: doctors.email })
      .from(doctors)
      .where(eq(doctors.id, doctor.id))
      .limit(1);

    if (patient && doctorRow) {
      const dateStr = format(appt.startsAt, "EEEE d MMMM yyyy", { locale: fr });
      const timeStr = format(appt.startsAt, "HH:mm");

      // SMS to patient (fire-and-forget)
      const reasonSuffix = reason ? ` Raison: ${reason}.` : "";
      sendSMS(
        patient.phone,
        `Doktori: Votre RDV avec Dr. ${doctorRow.name} le ${dateStr} a ete annule.${reasonSuffix} Reservez un nouveau RDV sur doktori.tn`,
        id,
      ).catch(console.error);

      // Email to patient (fire-and-forget)
      if (patient.email) {
        const email = cancellationConfirmation({
          patientName: patient.name,
          doctorName: doctorRow.name,
          date: `${dateStr} à ${timeStr}`,
          rebookUrl: `https://doktori.tn/medecin/${doctor.id}`,
        });
        sendEmail({ to: patient.email, ...email, appointmentId: id }).catch(
          console.error,
        );
      }

      // Email to doctor (fire-and-forget)
      if (doctorRow.email) {
        const doctorEmail = cancellationDoctor({
          doctorName: doctorRow.name,
          patientName: patient.name,
          date: dateStr,
          time: timeStr,
        });
        sendEmail({ to: doctorRow.email, ...doctorEmail, appointmentId: id }).catch(
          console.error,
        );
      }
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[POST /api//appointments/[id]/cancel-doctor]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
