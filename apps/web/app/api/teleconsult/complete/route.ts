import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, appointments, doctors, doctorWallets, walletTransactions, appointmentTypes } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { buildTeleconsultReceiptEmail } from "@/emails/templates";

const COMMISSION_RATE = parseFloat(process.env.TELECONSULT_COMMISSION_RATE ?? "0.15");

export async function POST(req: Request) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { appointmentId } = body as Record<string, unknown>;

  if (!appointmentId || typeof appointmentId !== "string") {
    return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    // 1. Verify appointment exists, is teleconsult, is completed, and belongs to this doctor
    const [appointment] = await tx
      .select({
        id: appointments.id,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
        type: appointments.type,
        status: appointments.status,
        appointmentTypeId: appointments.appointmentTypeId,
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
      return { error: "Rendez-vous introuvable ou accès non autorisé", status: 404 };
    }

    if (appointment.type !== "teleconsult") {
      return { error: "Ce rendez-vous n'est pas de type téléconsultation", status: 422 };
    }

    if (appointment.status !== "completed") {
      return { error: "Le rendez-vous doit être marqué comme terminé", status: 422 };
    }

    // 2. Check idempotency — no existing credit transaction for this appointment
    const [existingCredit] = await tx
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.appointmentId, appointmentId),
          eq(walletTransactions.doctorId, doctor.id)
        )
      )
      .limit(1);

    if (existingCredit) {
      return { error: "Ce rendez-vous a déjà été crédité", status: 409 };
    }

    // 3. Determine fee
    // Try appointment type fee first, then doctor.teleconsultFee, then doctor.consultationFee
    let resolvedFee: number | null = null;

    if (appointment.appointmentTypeId) {
      const [apptType] = await tx
        .select({ fee: appointmentTypes.fee })
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, appointment.appointmentTypeId))
        .limit(1);
      if (apptType?.fee != null) {
        resolvedFee = apptType.fee;
      }
    }

    if (resolvedFee == null) {
      const [doctorRow] = await tx
        .select({
          teleconsultFee: doctors.teleconsultFee,
          consultationFee: doctors.consultationFee,
        })
        .from(doctors)
        .where(eq(doctors.id, doctor.id))
        .limit(1);

      resolvedFee = doctorRow?.teleconsultFee ?? doctorRow?.consultationFee ?? 0;
    }

    const fee: number = resolvedFee ?? 0;

    // 4. Calculate commission and credit
    const commission = Math.round(fee * COMMISSION_RATE);
    const credit = fee - commission;

    // 5. Insert credit transaction (full fee, positive)
    await tx.insert(walletTransactions).values({
      doctorId: doctor.id,
      type: "credit",
      amount: fee,
      appointmentId,
      description: "Téléconsultation — honoraires",
    });

    // 6. Insert commission transaction (negative, platform fee)
    await tx.insert(walletTransactions).values({
      doctorId: doctor.id,
      type: "commission",
      amount: -commission,
      appointmentId,
      description: "Téléconsultation — commission plateforme",
    });

    // 7. Upsert wallet and update balances
    await tx
      .insert(doctorWallets)
      .values({
        doctorId: doctor.id,
        balance: credit,
        totalEarned: fee,
        totalCommission: commission,
        totalWithdrawn: 0,
      })
      .onConflictDoUpdate({
        target: doctorWallets.doctorId,
        set: {
          balance: sql`doctor_wallets.balance + ${credit}`,
          totalEarned: sql`doctor_wallets.total_earned + ${fee}`,
          totalCommission: sql`doctor_wallets.total_commission + ${commission}`,
          updatedAt: new Date(),
        },
      });

    return { fee, commission, credit, patientId: appointment.patientId };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status as number });
  }

  // Post-consultation document delivery (fire-and-forget, best-effort)
  void sendPostConsultationDocuments({
    appointmentId,
    patientId: result.patientId,
    doctorId: doctor.id,
    fee: result.fee,
  });

  return NextResponse.json(result, { status: 200 });
}

// ── Post-consultation document delivery ────────────────────────────────────────

async function sendPostConsultationDocuments({
  appointmentId,
  patientId,
  doctorId,
  fee,
}: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  fee: number;
}) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // 1. Get doctor name and patient info in parallel
    const [doctorResult, patientResult] = await Promise.all([
      db.execute(sql`SELECT name FROM doctors WHERE id = ${doctorId} LIMIT 1`),
      db.execute(sql`
        SELECT phone, email, name, cnam_number
        FROM patients
        WHERE id = ${patientId}
        LIMIT 1
      `),
    ]);

    const doctorName =
      (doctorResult as unknown as Array<{ name: string }>)[0]?.name ?? "votre médecin";

    const patient = (patientResult as unknown as Array<{
      phone: string;
      email: string | null;
      name: string;
      cnam_number: string | null;
    }>)[0];

    if (!patient) return;

    // 2. Check for prescription
    const prescriptionResult = await db.execute(sql`
      SELECT id FROM prescriptions WHERE appointment_id = ${appointmentId} LIMIT 1
    `);
    const prescription = (prescriptionResult as unknown as Array<{ id: string }>)[0] ?? null;

    // 3. Check for consultation note
    const noteResult = await db.execute(sql`
      SELECT id FROM consultation_notes WHERE appointment_id = ${appointmentId} LIMIT 1
    `);
    const note = (noteResult as unknown as Array<{ id: string }>)[0] ?? null;

    // 4. Build document links for SMS
    const docs: string[] = [];
    if (prescription) {
      docs.push(`Ordonnance: ${baseUrl}/ordonnance/${prescription.id}`);
    }
    if (note) {
      docs.push(`Compte-rendu: ${baseUrl}/consultation/${appointmentId}`);
    }

    // 5. Send SMS with document links
    const docText = docs.length > 0 ? `\n${docs.join("\n")}` : "";
    const receiptText = `Montant: ${(fee / 1000).toFixed(0)} DT (payé via Doktori)`;
    await sendSMS(
      patient.phone,
      `Doktori: Votre téléconsultation avec Dr. ${doctorName} est terminée.\n${receiptText}${docText}\nMerci d'avoir utilisé Doktori !`,
      appointmentId
    );

    // 6. Send email if patient has one
    if (patient.email) {
      await sendEmail({
        to: patient.email,
        subject: `Téléconsultation terminée — Dr. ${doctorName}`,
        html: buildTeleconsultReceiptEmail({
          patientName: patient.name,
          doctorName,
          fee,
          prescriptionUrl: prescription ? `${baseUrl}/ordonnance/${prescription.id}` : null,
          noteUrl: note ? `${baseUrl}/consultation/${appointmentId}` : null,
          cnamEligible: !!patient.cnam_number,
          reviewUrl: `${baseUrl}/avis/${appointmentId}`,
        }),
        appointmentId,
      });
    }

    // 7. If patient has CNAM, create a draft claim automatically (best-effort)
    if (patient.cnam_number) {
      await db.execute(sql`
        INSERT INTO cnam_claims (appointment_id, doctor_id, patient_id, cnam_number, patient_role, amount, consultation_date, status)
        SELECT
          ${appointmentId},
          doctor_id,
          patient_id,
          ${patient.cnam_number},
          'assure',
          ${fee},
          CURRENT_DATE,
          'draft'
        FROM appointments
        WHERE id = ${appointmentId}
        ON CONFLICT (appointment_id) DO NOTHING
      `);
    }
  } catch (err) {
    console.error("[teleconsult/complete] Post-consultation delivery failed:", err);
  }
}
