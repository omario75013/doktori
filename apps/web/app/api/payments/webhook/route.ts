import { NextResponse } from "next/server";
import { verifyFlouciPayment } from "@/lib/flouci";
import { getAppointmentPayment, markAppointmentPaid } from "@/lib/queries/payments";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json();
  const { payment_id, reference } = body;

  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  // Idempotency: if already paid, return 200 without re-processing
  const appt = await getAppointmentPayment(reference);
  if (!appt) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }
  if (appt.payment_status === "paid") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  // Verify the payment with Flouci before trusting the callback
  const verification = await verifyFlouciPayment(payment_id || reference);
  if (!verification.success) {
    return NextResponse.json({ error: "Paiement non vérifié" }, { status: 402 });
  }

  // Mark the appointment as paid
  await markAppointmentPaid(reference, payment_id || reference, "flouci");

  // If this is a teleconsult appointment, notify the doctor
  if (appt.type === "teleconsult") {
    try {
      const doctorInfo = await db.execute(sql`
        SELECT d.name, d.phone, d.email, p.name AS patient_name
        FROM doctors d
        JOIN patients p ON p.id = ${appt.patient_id}
        WHERE d.id = ${appt.doctor_id}
      `);
      interface DoctorInfoRow { name: string; phone: string; email: string | null; patient_name: string; }
      const doc = (doctorInfo as unknown as DoctorInfoRow[])[0];
      if (doc) {
        const apptDate = new Date(appt.starts_at);
        const dateStr = apptDate.toLocaleDateString("fr-TN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        const timeStr = apptDate.toLocaleTimeString("fr-TN", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // SMS — fire-and-forget
        sendSMS(
          doc.phone,
          `Doktori: Nouveau RDV vidéo confirmé avec ${doc.patient_name} le ${dateStr} à ${timeStr}. Le patient a payé — rendez-vous dans votre agenda.`,
          appt.id,
        ).catch((e) => console.error("[webhook] doctor SMS failed:", e));

        // Email — fire-and-forget
        if (doc.email) {
          sendEmail({
            to: doc.email,
            subject: `Nouveau RDV vidéo confirmé — ${doc.patient_name}`,
            html: `<div style="font-family:sans-serif;max-width:500px">
              <h2 style="color:#0891B2">Nouveau rendez-vous vidéo</h2>
              <p><strong>Patient:</strong> ${doc.patient_name}</p>
              <p><strong>Date:</strong> ${dateStr} à ${timeStr}</p>
              <p><strong>Paiement:</strong> Confirmé ✓</p>
              <p style="color:#5E7574;font-size:13px">Le patient a payé via Doktori. Connectez-vous à votre agenda pour préparer la consultation.</p>
            </div>`,
            appointmentId: appt.id,
          }).catch((e) => console.error("[webhook] doctor email failed:", e));
        }
      }
    } catch (e) {
      // Notification failure must never block payment confirmation
      console.error("[webhook] teleconsult doctor notification failed:", e);
    }
  }

  return NextResponse.json({ success: true });
}
