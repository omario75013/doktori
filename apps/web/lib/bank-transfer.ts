import "server-only";
import { db, bankTransferIntents, doctorPaymentMethods, walletTransactions } from "@doktori/db";
import type { DbTx } from "./admin-audit-wrapper";
import { and, eq, sql } from "drizzle-orm";

export interface BankTransferConfig {
  iban: string;
  bic?: string;
  bankName: string;
  accountHolder: string;
}

/** Generate a 12-char alphanumeric reference (uppercase + digits, easy to read on bank screens). */
function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit ambiguous I, O, 0, 1
  return "DK" + Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export interface CreateBankTransferIntentArgs {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number; // in millimes
  expiryDays: number; // typically 7
}

export interface BankTransferIntentResult {
  intentId: string;
  reference: string;
  amount: number;
  bankConfig: BankTransferConfig;
  expiresAt: Date;
}

export async function createBankTransferIntent(args: CreateBankTransferIntentArgs): Promise<BankTransferIntentResult> {
  // Fetch doctor's bank_transfer config
  const [methodRow] = await db
    .select({ enabled: doctorPaymentMethods.enabled, config: doctorPaymentMethods.config })
    .from(doctorPaymentMethods)
    .where(and(
      eq(doctorPaymentMethods.doctorId, args.doctorId),
      eq(doctorPaymentMethods.method, "bank_transfer")
    ))
    .limit(1);

  if (!methodRow || !methodRow.enabled) {
    throw new Error("Doctor has not enabled bank transfer as a payment method");
  }
  const config = methodRow.config as Partial<BankTransferConfig> | null;
  if (!config?.iban || !config?.bankName || !config?.accountHolder) {
    throw new Error("Doctor's bank transfer configuration is incomplete (iban, bankName, accountHolder required)");
  }

  // Generate unique reference (retry up to 3 times in the rare case of collision)
  let reference = generateReference();
  for (let i = 0; i < 3; i++) {
    const [existing] = await db.select({ id: bankTransferIntents.id }).from(bankTransferIntents).where(eq(bankTransferIntents.reference, reference)).limit(1);
    if (!existing) break;
    reference = generateReference();
  }

  const expiresAt = new Date(Date.now() + args.expiryDays * 24 * 60 * 60 * 1000);

  const [intent] = await db
    .insert(bankTransferIntents)
    .values({
      appointmentId: args.appointmentId,
      patientId: args.patientId,
      doctorId: args.doctorId,
      amount: args.amount,
      reference,
      status: "pending",
      expiresAt,
    })
    .returning({ id: bankTransferIntents.id });

  return {
    intentId: intent.id,
    reference,
    amount: args.amount,
    bankConfig: {
      iban: config.iban,
      bic: config.bic,
      bankName: config.bankName,
      accountHolder: config.accountHolder,
    },
    expiresAt,
  };
}

/** Confirm a pending bank transfer. Idempotent: re-confirming a confirmed intent is a no-op.
 *  Pass `tx` to participate in an existing transaction (e.g. from withAdminAudit);
 *  otherwise this opens its own. */
export async function confirmBankTransfer(args: {
  intentId: string;
  adminId: string;
  tx?: DbTx;
}): Promise<void> {
  const run = async (tx: DbTx | typeof db) => {
    const [intent] = await tx
      .select()
      .from(bankTransferIntents)
      .where(eq(bankTransferIntents.id, args.intentId))
      .limit(1);

    if (!intent) throw new Error("Bank transfer intent not found");
    if (intent.status === "confirmed") return; // idempotent
    if (intent.status !== "pending") throw new Error(`Cannot confirm intent in status: ${intent.status}`);

    await tx
      .update(bankTransferIntents)
      .set({
        status: "confirmed",
        confirmedByAdminId: args.adminId,
        confirmedAt: new Date(),
      })
      .where(eq(bankTransferIntents.id, args.intentId));

    if (intent.appointmentId) {
      await tx.execute(sql`
        UPDATE appointments
        SET payment_status = 'paid',
            payment_ref = ${intent.reference},
            payment_provider = 'bank_transfer',
            payment_method = 'bank_transfer',
            payment_amount = ${intent.amount},
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = ${intent.appointmentId}
      `);
    }

    if (intent.doctorId) {
      await tx
        .insert(walletTransactions)
        .values({
          doctorId: intent.doctorId,
          type: "credit",
          amount: intent.amount,
          appointmentId: intent.appointmentId,
          description: `Virement bancaire confirmé — ref ${intent.reference}`,
        });
    }
  };

  if (args.tx) {
    await run(args.tx);
  } else {
    await db.transaction(run);
  }
}

export async function rejectBankTransfer(args: {
  intentId: string;
  adminId: string;
  reason: string;
  tx?: DbTx;
}): Promise<void> {
  const exec = args.tx ?? db;
  const [intent] = await exec
    .select({ status: bankTransferIntents.status })
    .from(bankTransferIntents)
    .where(eq(bankTransferIntents.id, args.intentId))
    .limit(1);
  if (!intent) throw new Error("Bank transfer intent not found");
  if (intent.status !== "pending") throw new Error(`Cannot reject intent in status: ${intent.status}`);

  await exec
    .update(bankTransferIntents)
    .set({
      status: "rejected",
      confirmedByAdminId: args.adminId,
      rejectedReason: args.reason,
    })
    .where(eq(bankTransferIntents.id, args.intentId));
}
