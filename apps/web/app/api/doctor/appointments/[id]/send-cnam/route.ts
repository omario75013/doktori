import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, appointments, cnamClaims, patients, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { buildCnamEmail } from "@/emails/templates";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const doctor = await requireDoctor();
    if (doctor instanceof NextResponse) return doctor;

    const { id: appointmentId } = await params;

    // 1. Verify appointment belongs to this doctor
    const [appointment] = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
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

    // 2. Fetch the CNAM claim
    const [claim] = await db
      .select({
        id: cnamClaims.id,
        cnamNumber: cnamClaims.cnamNumber,
        amount: cnamClaims.amount,
        consultationDate: cnamClaims.consultationDate,
        status: cnamClaims.status,
      })
      .from(cnamClaims)
      .where(eq(cnamClaims.appointmentId, appointmentId))
      .limit(1);

    if (!claim) {
      return NextResponse.json(
        { error: "Aucun bordereau CNAM pour ce rendez-vous" },
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

    // 4. Fire-and-forget: SMS + email
    void (async () => {
      await sendSMS(
        patientRow.phone,
        `Doktori: Dr. ${doctorName} vous a envoyé votre fiche CNAM pour remboursement.`,
        appointmentId
      );

      if (patientRow.email) {
        await sendEmail({
          to: patientRow.email,
          subject: `Votre bordereau CNAM — Dr. ${doctorName}`,
          html: buildCnamEmail({
            patientName: patientRow.name,
            doctorName,
            cnamNumber: claim.cnamNumber,
            amount: claim.amount,
            consultationDate: claim.consultationDate,
            status: claim.status,
          }),
          appointmentId,
        });
      }
    })();

    return NextResponse.json({ sent: true });
  } catch (e) {
    console.error("[POST /api//doctor/appointments/[id]/send-cnam]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
