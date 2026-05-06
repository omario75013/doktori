import { NextRequest, NextResponse } from "next/server";
import { db, appointments, doctors, doctorPaymentMethods, patients } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { isEnabled } from "@/lib/feature-flags";
import { createCheckoutSession } from "@/lib/stripe";
import { createBankTransferIntent } from "@/lib/bank-transfer";
import { createFlouciPayment } from "@/lib/flouci";
import { getSetting } from "@/lib/platform-settings";

const bodySchema = z.object({
  appointmentId: z.string().uuid(),
  method: z.enum(["stripe_card", "bank_transfer", "cash_on_premises", "flouci"]),
});

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { appointmentId, method } = parsed.data;

  // Feature flag gates per provider
  if (method === "stripe_card" && !(await isEnabled("payment_stripe_enabled"))) {
    return NextResponse.json({ error: "Paiement par carte indisponible" }, { status: 403 });
  }
  if (method === "bank_transfer" && !(await isEnabled("payment_bank_transfer_enabled"))) {
    return NextResponse.json({ error: "Virement bancaire indisponible" }, { status: 403 });
  }

  // Load appointment + verify patient ownership. payment_status / payment_amount
  // are columns added by migrations (not in the Drizzle schema yet) — use raw SQL.
  const apptRows = await db.execute<{
    id: string;
    doctor_id: string;
    patient_id: string;
    payment_status: string | null;
    payment_amount: number | null;
  }>(sql`
    SELECT id, doctor_id, patient_id, payment_status, payment_amount
    FROM appointments
    WHERE id = ${appointmentId}
    LIMIT 1
  `);
  const appt = (apptRows as unknown as Array<{
    id: string;
    doctor_id: string;
    patient_id: string;
    payment_status: string | null;
    payment_amount: number | null;
  }>)[0];

  if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  if (appt.patient_id !== patient.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (appt.payment_status === "paid") {
    return NextResponse.json({ error: "Déjà payé" }, { status: 409 });
  }

  // Verify doctor has this method enabled
  const [methodRow] = await db
    .select({ enabled: doctorPaymentMethods.enabled })
    .from(doctorPaymentMethods)
    .where(
      and(
        eq(doctorPaymentMethods.doctorId, appt.doctor_id),
        eq(doctorPaymentMethods.method, method)
      )
    )
    .limit(1);
  if (!methodRow?.enabled) {
    return NextResponse.json(
      { error: "Méthode non disponible pour ce médecin" },
      { status: 400 }
    );
  }

  // Get doctor info + fallback consultationFee for amount
  const [doc] = await db
    .select({
      name: doctors.name,
      email: doctors.email,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .where(eq(doctors.id, appt.doctor_id))
    .limit(1);

  const amount = appt.payment_amount ?? doc?.consultationFee ?? 0;
  if (amount <= 0) {
    return NextResponse.json({ error: "Montant du RDV non défini" }, { status: 400 });
  }

  // Look up patient email (JWT payload only has id+phone)
  const [patientRow] = await db
    .select({ email: patients.email })
    .from(patients)
    .where(eq(patients.id, patient.id))
    .limit(1);
  const customerEmail = patientRow?.email ?? doc?.email ?? "noreply@doktori.tn";

  // Branch by method
  try {
    switch (method) {
      case "cash_on_premises": {
        await db.execute(sql`
          UPDATE appointments
          SET payment_status = 'pending_cash',
              payment_method = 'cash_on_premises',
              payment_provider = 'cash',
              updated_at = NOW()
          WHERE id = ${appointmentId}
        `);
        return NextResponse.json({ provider: "cash", status: "pending_cash" });
      }

      case "stripe_card": {
        const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
        const session = await createCheckoutSession({
          appointmentId,
          amount,
          currency: "tnd",
          customerEmail,
          description: `Consultation Dr ${doc?.name ?? "Doktori"}`,
          successUrl: `${baseUrl}/rdv/${appointmentId}/paiement/succes?session={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}/rdv/${appointmentId}/paiement/annule`,
        });
        // Mark as pending — webhook will flip to paid
        await db.execute(sql`
          UPDATE appointments
          SET payment_status = 'pending',
              payment_method = 'stripe_card',
              payment_provider = 'stripe',
              payment_amount = ${amount},
              updated_at = NOW()
          WHERE id = ${appointmentId}
        `);
        return NextResponse.json({
          provider: "stripe",
          redirectUrl: session.url,
          sessionId: session.sessionId,
        });
      }

      case "bank_transfer": {
        const expiryDaysSetting = await getSetting("payment.bank_transfer.expiry_days");
        const expiryDays = expiryDaysSetting ? parseInt(expiryDaysSetting, 10) : 7;
        const intent = await createBankTransferIntent({
          appointmentId,
          patientId: patient.id,
          doctorId: appt.doctor_id,
          amount,
          expiryDays: isNaN(expiryDays) ? 7 : expiryDays,
        });
        await db.execute(sql`
          UPDATE appointments
          SET payment_status = 'pending_transfer',
              payment_method = 'bank_transfer',
              payment_provider = 'bank_transfer',
              payment_amount = ${amount},
              updated_at = NOW()
          WHERE id = ${appointmentId}
        `);
        return NextResponse.json({
          provider: "bank_transfer",
          intentId: intent.intentId,
          reference: intent.reference,
          amount: intent.amount,
          bankConfig: intent.bankConfig,
          expiresAt: intent.expiresAt,
        });
      }

      case "flouci": {
        const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
        const flouciResult = await createFlouciPayment({
          amount,
          reference: appointmentId,
          successUrl: `${baseUrl}/rdv/${appointmentId}/paiement/succes`,
          failUrl: `${baseUrl}/rdv/${appointmentId}/paiement/annule`,
        });
        if (!flouciResult.success || !flouciResult.paymentUrl) {
          return NextResponse.json(
            { error: flouciResult.error ?? "Erreur Flouci" },
            { status: 503 }
          );
        }
        await db.execute(sql`
          UPDATE appointments
          SET payment_status = 'pending',
              payment_method = 'flouci',
              payment_provider = 'flouci',
              payment_amount = ${amount},
              updated_at = NOW()
          WHERE id = ${appointmentId}
        `);
        return NextResponse.json({
          provider: "flouci",
          redirectUrl: flouciResult.paymentUrl,
        });
      }
    }
  } catch (e) {
    console.error("[POST /api/payments/checkout]", e);
    const msg = e instanceof Error ? e.message : "Erreur paiement";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
