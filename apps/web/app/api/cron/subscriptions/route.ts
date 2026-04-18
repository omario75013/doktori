import { NextResponse } from "next/server";
import { db, subscriptions, doctors } from "@doktori/db";
import { eq, and, lt, or, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { buildSubscriptionExpiredEmail } from "@/emails/templates";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all active or trial subscriptions that have ended
  const expiredSubs = await db
    .select({
      id: subscriptions.id,
      doctorId: subscriptions.doctorId,
      plan: subscriptions.plan,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      and(
        or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trial")),
        lt(subscriptions.endsAt, now)
      )
    );

  if (expiredSubs.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  // Mark all expired and hide their doctors
  for (const sub of expiredSubs) {
    // Mark subscription as expired
    await db
      .update(subscriptions)
      .set({ status: "expired", updatedAt: now })
      .where(eq(subscriptions.id, sub.id));

    // Hide doctor from search
    await db.execute(sql`UPDATE doctors SET is_visible = false WHERE id = ${sub.doctorId}`);

    // Send expiry notification email (fire-and-forget)
    const [doctor] = await db
      .select({ name: doctors.name, email: doctors.email })
      .from(doctors)
      .where(eq(doctors.id, sub.doctorId))
      .limit(1);

    if (doctor) {
      sendEmail({
        to: doctor.email,
        subject: "Votre abonnement Doktori a expiré",
        html: buildSubscriptionExpiredEmail({
          doctorName: doctor.name,
          planName: sub.plan,
        }),
      }).catch(console.error);
    }
  }

  return NextResponse.json({ expired: expiredSubs.length });
}
