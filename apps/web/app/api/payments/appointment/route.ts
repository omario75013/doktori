import { NextResponse } from "next/server";
import { db, appointments, doctors } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { createFlouciPayment } from "@/lib/flouci";

export async function POST(req: Request) {
  const { appointmentId } = await req.json();
  if (!appointmentId) return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });

  // Fetch appointment with doctor info
  const [appt] = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

  const [doctor] = await db
    .select({ consultationFee: doctors.consultationFee })
    .from(doctors)
    .where(eq(doctors.id, appt.doctorId))
    .limit(1);

  if (!doctor?.consultationFee) {
    return NextResponse.json({ error: "Tarif consultation non défini" }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
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
}
