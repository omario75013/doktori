import { NextRequest, NextResponse } from "next/server";
import { db, appointments, doctors } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { createFlouciPayment } from "@/lib/flouci";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function POST(req: NextRequest) {
  try {
    const patient = getPatientFromRequest(req);
    if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { appointmentId } = await req.json();
    if (!appointmentId) return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });

    // Fetch appointment with doctor info — select patientId for ownership check
    const [appt] = await db
      .select({
        id: appointments.id,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

    // Verify the authenticated patient owns this appointment
    if (appt.patientId !== patient.id) {
      return NextResponse.json({ error: "Accès non autorisé à ce RDV" }, { status: 403 });
    }

    const [doctor] = await db
      .select({ consultationFee: doctors.consultationFee })
      .from(doctors)
      .where(eq(doctors.id, appt.doctorId))
      .limit(1);

    if (!doctor?.consultationFee) {
      return NextResponse.json({ error: "Tarif consultation non défini" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
    const successUrl = `${baseUrl}/payment/success?appt=${appointmentId}`;
    const failUrl = `${baseUrl}/payment/fail?appt=${appointmentId}`;

    const payment = await createFlouciPayment({
      amount: doctor.consultationFee, // already in millimes
      reference: appointmentId,
      successUrl,
      failUrl,
    });

    if (!payment.success || !payment.paymentUrl) {
      return NextResponse.json({ error: payment.error || "Erreur" }, { status: 500 });
    }

    // Store the payment ref and mark as pending
    await db.execute(sql`
      UPDATE appointments
      SET payment_status = 'pending',
          payment_amount = ${doctor.consultationFee},
          payment_ref = ${payment.paymentRef},
          payment_provider = 'flouci',
          updated_at = NOW()
      WHERE id = ${appointmentId}
    `);

    return NextResponse.json({
      paymentUrl: payment.paymentUrl,
      paymentRef: payment.paymentRef,
    });
  } catch (e) {
    console.error("[POST /api/payments/appointment]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
