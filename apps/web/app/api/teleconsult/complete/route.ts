import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, appointments, doctors, doctorWallets, walletTransactions, appointmentTypes } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";

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

    return { fee, commission, credit };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status as number });
  }

  return NextResponse.json(result, { status: 200 });
}
