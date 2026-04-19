import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, appointments, prescriptions, patients, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { buildPrescriptionEmail } from "@/emails/templates";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctor = await requireDoctor();
    if (doctor instanceof NextResponse) return doctor;

    const { id: appointmentId } = await params;

    // 1. Verify appointment belongs to this doctor and is completed
    const [appointment] = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.doctorId, doctor.id)
        )
      )
      .limit(1);

    if (!appointment) {
      return NextResponse.json(
        { error: "Rendez-vous introuvable ou accès non autorisé" },
        { status: 404 }
      );
    }

    if (appointment.status !== "completed") {
      return NextResponse.json(
        { error: "Le rendez-vous doit être terminé pour envoyer une ordonnance" },
        { status: 422 }
      );
    }

    // 2. Fetch the prescription
    const [prescription] = await db
      .select({
        id: prescriptions.id,
        content: prescriptions.content,
      })
      .from(prescriptions)
      .where(eq(prescriptions.appointmentId, appointmentId))
      .limit(1);

    if (!prescription) {
      return NextResponse.json(
        { error: "Aucune ordonnance pour ce rendez-vous" },
        { status: 404 }
      );
    }

    // 3. Fetch patient and doctor info in parallel
    const [[patientRow], [doctorRow]] = await Promise.all([
      db
        .select({
          name: patients.name,
          phone: patients.phone,
          email: patients.email,
        })
        .from(patients)
        .where(eq(patients.id, appointment.patientId))
        .limit(1),

      db
        .select({ name: doctors.name })
        .from(doctors)
        .where(eq(doctors.id, doctor.id))
        .limit(1),
    ]);

    if (!patientRow) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }

    const doctorName = doctorRow?.name ?? "votre médecin";
    const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
    const prescriptionUrl = `${baseUrl}/ordonnance/${prescription.id}`;

    // 4. Fire-and-forget: SMS + email
    void (async () => {
      await sendSMS(
        patientRow.phone,
        `Doktori: Dr. ${doctorName} vous a envoyé une ordonnance. Voir: ${prescriptionUrl}`,
        appointmentId
      );

      if (patientRow.email) {
        await sendEmail({
          to: patientRow.email,
          subject: `Votre ordonnance — Dr. ${doctorName}`,
          html: buildPrescriptionEmail({
            patientName: patientRow.name,
            doctorName,
            content: prescription.content,
            prescriptionUrl,
          }),
          appointmentId,
        });
      }
    })();

    return NextResponse.json({ sent: true });
  } catch (e) {
    console.error("[POST /api//doctor/appointments/[id]/send-prescription]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
