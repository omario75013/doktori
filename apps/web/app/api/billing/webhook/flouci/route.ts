import { NextResponse } from "next/server";
import { db, subscriptions } from "@doktori/db";
import { eq } from "drizzle-orm";
import { verifyFlouciPayment } from "@/lib/flouci";

export async function POST(req: Request) {
  const body = await req.json();
  const { payment_id, reference } = body;

  if (!payment_id && !reference) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  // Find the subscription by external_ref OR id (dev mode uses reference as sub ID)
  const subId = reference;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
  if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  // Idempotency: if already active, return 200 without re-processing
  if (sub.status === "active") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  // Verify with Flouci before activating the subscription
  const verification = await verifyFlouciPayment(payment_id || sub.externalRef || "");
  if (!verification.success) {
    return NextResponse.json({ error: "Paiement non vérifié" }, { status: 402 });
  }

  // Activate the subscription
  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setMonth(endsAt.getMonth() + 1);

  await db.update(subscriptions)
    .set({
      status: "active",
      startsAt: now,
      endsAt,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, sub.id));

  return NextResponse.json({ success: true });
}
