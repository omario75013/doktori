import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { appointments, walletTransactions } from "@doktori/db";
import { eq } from "drizzle-orm";
import { refundPayment } from "@/lib/stripe";

type RouteContext = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  reason: z.string().min(10).max(500),
  amount: z.number().int().positive().optional(),
});

export const POST = withAdminAudit<
  {
    ok: true;
    appointment: typeof appointments.$inferSelect;
    paymentStatus: string;
    refundedAmount: number;
    stripeRefundId: string | null;
  },
  RouteContext
>({
  action: "appointments.refund",
  resourceType: "appointments",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as { reason?: unknown } | null;
    return typeof b?.reason === "string" ? b.reason : null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, resourceId))
      .limit(1);
    return row
      ? {
          paymentStatus: row.paymentStatus,
          paymentAmount: row.paymentAmount,
          paymentRef: row.paymentRef,
          paymentProvider: row.paymentProvider,
        }
      : null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { reason, amount } = parsed.data;

    const [appt] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, resourceId))
      .limit(1);
    if (!appt) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
    }
    if (appt.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: `Remboursement impossible: paymentStatus='${appt.paymentStatus}'` },
        { status: 409 }
      );
    }
    if (!appt.paymentAmount || appt.paymentAmount <= 0) {
      return NextResponse.json({ error: "Montant payé inconnu" }, { status: 409 });
    }
    const refundedAmount = amount ?? appt.paymentAmount;
    if (refundedAmount > appt.paymentAmount) {
      return NextResponse.json(
        { error: "Le montant de remboursement dépasse le montant payé" },
        { status: 400 }
      );
    }

    const provider = appt.paymentProvider ?? "";
    let nextPaymentStatus: "refund_pending" | "refunded";
    let stripeRefundId: string | null = null;

    if (provider === "stripe") {
      if (!appt.paymentRef) {
        return NextResponse.json(
          { error: "Référence Stripe (charge) manquante" },
          { status: 409 }
        );
      }
      try {
        const refund = await refundPayment(appt.paymentRef);
        stripeRefundId = refund.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur Stripe";
        return NextResponse.json(
          { error: `Échec de l'appel Stripe: ${msg}` },
          { status: 502 }
        );
      }
      // The actual refund is confirmed via charge.refunded webhook.
      nextPaymentStatus = "refund_pending";
    } else {
      // bank_transfer / flouci / cash / other — admin handles refund externally.
      nextPaymentStatus = "refunded";
    }

    const [updated] = await tx
      .update(appointments)
      .set({ paymentStatus: nextPaymentStatus, updatedAt: new Date() })
      .where(eq(appointments.id, resourceId))
      .returning();

    // Always log the wallet debit so accounting reconciles.
    await tx.insert(walletTransactions).values({
      doctorId: appt.doctorId,
      type: "debit",
      amount: refundedAmount,
      appointmentId: resourceId,
      description: `Remboursement (${provider || "manuel"}) — ${reason.slice(0, 200)}`,
    });

    return {
      ok: true,
      appointment: updated,
      paymentStatus: nextPaymentStatus,
      refundedAmount,
      stripeRefundId,
    } as const;
  },
});
