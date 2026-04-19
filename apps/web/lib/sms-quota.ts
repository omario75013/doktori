import { db, smsUsage, subscriptions } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";

const ESSENTIEL_LIMIT = 200;
const UNLIMITED = 999999;

function currentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function getActivePlan(doctorId: string): Promise<string> {
  const rows = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.doctorId, doctorId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);

  return rows[0]?.plan ?? "free";
}

function limitForPlan(plan: string): number {
  if (plan === "pro" || plan === "clinique") return UNLIMITED;
  if (plan === "essentiel") return ESSENTIEL_LIMIT;
  // free and trial: use essentiel limit as a reasonable default
  return ESSENTIEL_LIMIT;
}

async function getCurrentCount(doctorId: string): Promise<number> {
  const month = currentMonth();
  const rows = await db
    .select({ count: smsUsage.count })
    .from(smsUsage)
    .where(and(eq(smsUsage.doctorId, doctorId), eq(smsUsage.month, month)))
    .limit(1);
  return rows[0]?.count ?? 0;
}

export async function canSendSMS(
  doctorId: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const plan = await getActivePlan(doctorId);
  const limit = limitForPlan(plan);

  if (limit === UNLIMITED) {
    return { allowed: true, remaining: UNLIMITED, limit };
  }

  const used = await getCurrentCount(doctorId);
  const remaining = Math.max(0, limit - used);
  return { allowed: remaining > 0, remaining, limit };
}

export async function incrementSMSCount(doctorId: string): Promise<void> {
  const month = currentMonth();
  await db
    .insert(smsUsage)
    .values({ doctorId, month, count: 1 })
    .onConflictDoUpdate({
      target: [smsUsage.doctorId, smsUsage.month],
      set: { count: sql`${smsUsage.count} + 1` },
    });
}

export async function getSMSUsage(
  doctorId: string
): Promise<{ used: number; limit: number; plan: string }> {
  const plan = await getActivePlan(doctorId);
  const limit = limitForPlan(plan);
  const used = await getCurrentCount(doctorId);
  return { used, limit, plan };
}
