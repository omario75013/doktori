import "server-only";
import Stripe from "stripe";

let _client: Stripe | null = null;

/** Lazy singleton — fails if STRIPE_SECRET_KEY is not set. */
export function getStripeClient(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // Pin the API version. We pass the type as `any` so that bumping the
  // Stripe SDK (which advances the LatestApiVersion literal) doesn't break
  // the build — the runtime call still works against any historical API
  // version that Stripe accepts.
  _client = new Stripe(key, { apiVersion: "2024-11-20.acacia" as any });
  return _client;
}

export interface CreateCheckoutSessionArgs {
  appointmentId: string;
  amount: number; // in smallest currency unit (millimes for TND)
  currency: "tnd" | "eur" | "usd";
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(args: CreateCheckoutSessionArgs): Promise<{
  sessionId: string;
  url: string;
}> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: args.currency,
          product_data: { name: args.description },
          unit_amount: args.amount,
        },
        quantity: 1,
      },
    ],
    customer_email: args.customerEmail,
    metadata: { appointmentId: args.appointmentId },
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { sessionId: session.id, url: session.url };
}

/**
 * Verify Stripe webhook signature. Throws on invalid.
 * Body MUST be the raw request body (not parsed JSON).
 */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function refundPayment(chargeId: string): Promise<Stripe.Refund> {
  const stripe = getStripeClient();
  return stripe.refunds.create({ charge: chargeId });
}

/** Reset internal singleton — for testing only. */
export function _resetStripeClientForTests(): void {
  _client = null;
}
