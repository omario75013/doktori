import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { refundPayment } from "@/lib/flouci";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find teleconsult appointments where the doctor never joined (15 min past start time)
  const noShows = await db.execute(sql`
    SELECT a.id, a.doctor_id, a.patient_id, a.starts_at, a.ends_at,
           a.payment_amount, a.payment_ref, a.appointment_type_id,
           d.name AS doctor_name, d.specialty,
           p.name AS patient_name, p.phone AS patient_phone, p.email AS patient_email
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN teleconsultations t ON t.appointment_id = a.id
    WHERE a.type = 'teleconsult'
      AND a.payment_status = 'paid'
      AND a.status IN ('confirmed', 'pending')
      AND a.starts_at < NOW() - INTERVAL '15 minutes'
      AND (t.id IS NULL OR t.started_at IS NULL)
    LIMIT 20
  `);

  const results = [];

  for (const appt of noShows as unknown as any[]) {
    // 1. Mark as doctor no-show (guard against concurrent runs with AND status check)
    const updated = await db.execute(sql`
      UPDATE appointments SET status = 'doctor_noshow', updated_at = NOW()
      WHERE id = ${appt.id} AND status IN ('confirmed', 'pending')
      RETURNING id
    `);

    // Skip if another cron run already processed this appointment
    if ((updated as unknown as any[]).length === 0) continue;

    // 2. Initiate refund
    let refundSuccess = false;
    try {
      refundSuccess = await refundPayment(appt.payment_ref, appt.payment_amount);
    } catch (e) {
      console.error(`[noshow-cron] refund error for appt ${appt.id}:`, e);
    }

    await db.execute(sql`
      UPDATE appointments
      SET payment_status = ${refundSuccess ? "refunded" : "refund_pending"},
          updated_at = NOW()
      WHERE id = ${appt.id}
    `);

    // 3. Find a replacement doctor (same specialty, teleconsult-capable, random)
    const replacements = await db.execute(sql`
      SELECT d.id, d.name, d.slug
      FROM doctors d
      WHERE d.specialty = ${appt.specialty}
        AND d.consultation_mode IN ('teleconsult', 'both')
        AND d.is_active = true
        AND d.id != ${appt.doctor_id}
      ORDER BY RANDOM()
      LIMIT 3
    `);

    const replacementDoctor =
      (replacements as unknown as any[]).length > 0
        ? (replacements as unknown as any[])[0]
        : null;

    // 4. Notify patient via SMS + email
    // TODO: localize SMS based on patient preference (currently French for Tunisian numbers)
    const refundMsg = refundSuccess
      ? "Votre paiement a été remboursé immédiatement."
      : "Votre remboursement est en cours de traitement.";

    const replacementMsg = replacementDoctor
      ? `\nNous vous proposons Dr. ${replacementDoctor.name}. Réservez sur ${process.env.NEXTAUTH_URL}/rdv/${replacementDoctor.slug}`
      : `\nRecherchez un autre médecin sur ${process.env.NEXTAUTH_URL}/recherche`;

    sendSMS(
      appt.patient_phone,
      `Doktori: Dr. ${appt.doctor_name} n'a pas pu assurer votre téléconsultation. ${refundMsg}${replacementMsg}\nNous nous excusons pour ce désagrément.`,
      appt.id,
    ).catch((e) => console.error(`[noshow-cron] patient SMS failed for appt ${appt.id}:`, e));

    if (appt.patient_email) {
      sendEmail({
        to: appt.patient_email,
        subject: "Votre téléconsultation n'a pas pu avoir lieu",
        html: `<div style="font-family:sans-serif;max-width:500px">
          <h2 style="color:#DC2626">Téléconsultation annulée</h2>
          <p>Dr. ${appt.doctor_name} n'a pas pu assurer votre rendez-vous vidéo prévu.</p>
          <p><strong>${refundMsg}</strong></p>
          ${
            replacementDoctor
              ? `<p style="margin-top:16px">Nous vous proposons un médecin disponible :</p>
            <a href="${process.env.NEXTAUTH_URL}/rdv/${replacementDoctor.slug}"
               style="display:inline-block;padding:12px 24px;background:#0891B2;color:white;border-radius:8px;text-decoration:none;font-weight:bold">
              Réserver avec Dr. ${replacementDoctor.name}
            </a>`
              : `<a href="${process.env.NEXTAUTH_URL}/recherche"
               style="display:inline-block;padding:12px 24px;background:#0891B2;color:white;border-radius:8px;text-decoration:none;font-weight:bold">
              Trouver un autre médecin
            </a>`
          }
          <p style="color:#5E7574;font-size:13px;margin-top:20px">Nous nous excusons pour ce désagrément. L'équipe Doktori</p>
        </div>`,
        appointmentId: appt.id,
      }).catch((e) =>
        console.error(`[noshow-cron] patient email failed for appt ${appt.id}:`, e),
      );
    }

    results.push({
      appointmentId: appt.id,
      refunded: refundSuccess,
      replacementDoctorId: replacementDoctor?.id ?? null,
    });
  }

  return NextResponse.json({ processed: results.length, results });
}
