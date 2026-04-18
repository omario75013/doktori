import { NextRequest, NextResponse } from "next/server";
import { cancelAppointment } from "@/lib/queries/appointments";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { db, appointments, patients, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { cancellationConfirmation, cancellationDoctor } from "@/emails/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notifyWaitlistPatients } from "@/lib/waitlist-notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  // patientId comes from verified JWT, not from request body (IDOR protection)
  const result = await cancelAppointment(id, patient.id);
  if (!result) return NextResponse.json({ error: "RDV introuvable ou déjà annulé" }, { status: 404 });

  // Notify waitlist patients that a slot freed up (fire-and-forget)
  void notifyWaitlistPatients(result.doctorId, result.startsAt);

  // Send notifications (fire-and-forget — never block the response)
  void (async () => {
    try {
      const [patientRow] = await db
        .select({ name: patients.name, phone: patients.phone, email: patients.email })
        .from(patients)
        .where(eq(patients.id, patient.id))
        .limit(1);

      const [doctorRow] = await db
        .select({ name: doctors.name, email: doctors.email, id: doctors.id })
        .from(doctors)
        .innerJoin(appointments, eq(appointments.doctorId, doctors.id))
        .where(eq(appointments.id, id))
        .limit(1);

      if (!patientRow || !doctorRow) return;

      const dateStr = format(result.startsAt, "EEEE d MMMM yyyy", { locale: fr });
      const timeStr = format(result.startsAt, "HH:mm");

      // SMS to patient
      sendSMS(
        patientRow.phone,
        `Doktori: Votre RDV avec Dr. ${doctorRow.name} le ${dateStr} a ete annule. Reservez un nouveau RDV sur doktori.tn`,
        id,
      ).catch(console.error);

      // Email to patient
      if (patientRow.email) {
        const email = cancellationConfirmation({
          patientName: patientRow.name,
          doctorName: doctorRow.name,
          date: `${dateStr} à ${timeStr}`,
          rebookUrl: `https://doktori.tn/medecin/${doctorRow.id}`,
        });
        sendEmail({ to: patientRow.email, ...email, appointmentId: id }).catch(console.error);
      }

      // Email to doctor
      if (doctorRow.email) {
        const doctorEmail = cancellationDoctor({
          doctorName: doctorRow.name,
          patientName: patientRow.name,
          date: dateStr,
          time: timeStr,
        });
        sendEmail({ to: doctorRow.email, ...doctorEmail, appointmentId: id }).catch(console.error);
      }
    } catch (e) {
      console.error("Cancel notifications failed:", e);
    }
  })();

  return NextResponse.json(result);
}
