import { NextRequest, NextResponse } from "next/server";
import { db, stripeEventsLog, walletTransactions } from "@doktori/db";
import { sql } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/stripe";
import type Stripe from "stripe";

// IMPORTANT: do NOT cache. Webhooks are POST-only and stateful.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Read raw body (NOT JSON.parse — Stripe needs the exact bytes for signature)
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, sig);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    console.warn("[stripe webhook] signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: ON CONFLICT DO NOTHING. If the event was already processed, return 200.
  const inserted = await db
    .insert(stripeEventsLog)
    .values({
      eventId: event.id,
      eventType: event.type,
      payload: event as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing()
    .returning({ eventId: stripeEventsLog.eventId });

  if (inserted.length === 0) {
    // Already processed
    return NextResponse.json({ received: true, idempotent: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded": {
        const obj = event.data.object as {
          metadata?: Record<string, string>;
          amount_total?: number;
          amount?: number;
        };
        const appointmentId = obj.metadata?.appointmentId;
        if (!appointmentId) {
          console.warn(`[stripe webhook] ${event.type} without appointmentId metadata`);
          break;
        }
        const amount = obj.amount_total ?? obj.amount ?? 0;

        await db.execute(sql`
          UPDATE appointments
          SET payment_status = 'paid',
              payment_provider = 'stripe',
              payment_method = COALESCE(payment_method, 'stripe_card'),
              payment_amount = COALESCE(payment_amount, ${amount}),
              payment_ref = ${event.id},
              paid_at = COALESCE(paid_at, NOW()),
              updated_at = NOW()
          WHERE id = ${appointmentId}
            AND payment_status != 'paid'
        `);

        // Credit doctor wallet
        const apptResult = await db.execute<{ doctor_id: string; payment_amount: number }>(sql`
          SELECT doctor_id, payment_amount
          FROM appointments
          WHERE id = ${appointmentId}
          LIMIT 1
        `);
        const apptRow = (apptResult as unknown as Array<{ doctor_id: string; payment_amount: number }>)[0];
        if (apptRow?.doctor_id) {
          await db
            .insert(walletTransactions)
            .values({
              doctorId: apptRow.doctor_id,
              type: "credit",
              amount: apptRow.payment_amount,
              appointmentId,
              description: `Paiement Stripe — ${event.id}`,
            })
            .onConflictDoNothing();
        }
        break;
      }

      case "charge.refunded":
      case "payment_intent.canceled": {
        const obj = event.data.object as {
          metadata?: Record<string, string>;
          payment_intent?: string;
        };
        const appointmentId = obj.metadata?.appointmentId;
        if (!appointmentId) break;
        await db.execute(sql`
          UPDATE appointments
          SET payment_status = 'refunded', updated_at = NOW()
          WHERE id = ${appointmentId}
        `);
        break;
      }

      default:
        // Other event types are logged via stripe_events_log but not actioned
        break;
    }
  } catch (e) {
    console.error(`[stripe webhook] error processing ${event.type}:`, e);
    // Stripe will retry. We've already logged the event so on retry we'll skip it.
    // BUT if we want Stripe to retry, return 5xx. For now, return 500.
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
