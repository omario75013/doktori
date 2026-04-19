import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, subscriptions } from "@doktori/db";
import { eq } from "drizzle-orm";
import { createFlouciPayment } from "@/lib/flouci";

const PLANS = {
  essentiel: { name: "Essentiel", priceMillimes: 49000 },
  pro: { name: "Pro", priceMillimes: 99000 },
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { plan, provider } = await req.json();
    if (!plan || !(plan in PLANS)) return NextResponse.json({ error: "Plan invalide" }, { status: 400 });

    const planInfo = PLANS[plan as keyof typeof PLANS];

    // Create pending subscription record
    const [subscription] = await db.insert(subscriptions).values({
      doctorId: session.user.id,
      plan,
      status: "pending",
      priceMillimes: planInfo.priceMillimes,
      paymentProvider: provider || "flouci",
    }).returning();

    const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
    const successUrl = `${baseUrl}/billing/success?sub=${subscription.id}`;
    const failUrl = `${baseUrl}/billing/fail?sub=${subscription.id}`;

    // Create Flouci payment
    const payment = await createFlouciPayment({
      amount: planInfo.priceMillimes,
      reference: subscription.id,
      successUrl,
      failUrl,
    });

    if (!payment.success || !payment.paymentUrl) {
      return NextResponse.json({ error: payment.error || "Erreur de paiement" }, { status: 500 });
    }

    // Update subscription with external ref
    await db.update(subscriptions)
      .set({ externalRef: payment.paymentRef, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id));

    return NextResponse.json({
      subscriptionId: subscription.id,
      paymentUrl: payment.paymentUrl,
    });
  } catch (e) {
    console.error("[POST /api//billing/checkout]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
