import { db, subscriptions, subscriptionPlans, planUsage } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";

export class PlanLimitError extends Error {
  constructor(
    public resource: string,
    public current: number,
    public max: number
  ) {
    super(`Plan limit reached for ${resource}: ${current}/${max}`);
    this.name = "PlanLimitError";
  }
}

export class FeatureDisabledError extends Error {
  constructor(public feature: string) {
    super(`Feature "${feature}" is not enabled on your current plan`);
    this.name = "FeatureDisabledError";
  }
}

type PlanResource = "appointments" | "sms" | "patients";

async function getActivePlan(doctorId: string) {
  const [sub] = await db
    .select({
      maxAppointmentsPerMonth: subscriptionPlans.maxAppointmentsPerMonth,
      maxSmsPerMonth: subscriptionPlans.maxSmsPerMonth,
      maxPatientsTotal: subscriptionPlans.maxPatientsTotal,
      enabledFeatures: subscriptionPlans.enabledFeatures,
      planCode: subscriptionPlans.code,
    })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.plan, subscriptionPlans.code))
    .where(
      and(
        eq(subscriptions.doctorId, doctorId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);

  return sub ?? null;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getMonthlyUsage(doctorId: string, month: string) {
  const [usage] = await db
    .select()
    .from(planUsage)
    .where(and(eq(planUsage.doctorId, doctorId), eq(planUsage.month, month)))
    .limit(1);
  return usage ?? null;
}

async function incrementUsage(doctorId: string, month: string, resource: PlanResource) {
  const col =
    resource === "appointments"
      ? sql`appointments_count = appointments_count + 1`
      : resource === "sms"
      ? sql`sms_count = sms_count + 1`
      : sql`patients_count = patients_count + 1`;

  await db.execute(sql`
    INSERT INTO plan_usage (doctor_id, month, appointments_count, sms_count, patients_count)
    VALUES (${doctorId}, ${month}, 0, 0, 0)
    ON CONFLICT (doctor_id, month) DO NOTHING
  `);

  await db.execute(sql`
    UPDATE plan_usage SET ${col}
    WHERE doctor_id = ${doctorId} AND month = ${month}
  `);
}

/**
 * Check and increment a plan usage counter.
 * Throws PlanLimitError (402) if the doctor's plan limit is reached.
 * No-ops (allows) when the doctor has no active subscription.
 */
export async function assertPlanLimit(
  doctorId: string,
  resource: PlanResource
): Promise<void> {
  const plan = await getActivePlan(doctorId);
  if (!plan) return; // no subscription = unrestricted (free tier behaviour)

  const month = currentMonth();

  if (resource === "patients") {
    // patients_count is a lifetime total, not monthly
    const [usage] = await db
      .select({ patientsCount: planUsage.patientsCount })
      .from(planUsage)
      .where(eq(planUsage.doctorId, doctorId))
      .limit(1);

    if (plan.maxPatientsTotal !== null && plan.maxPatientsTotal !== undefined) {
      const current = usage?.patientsCount ?? 0;
      if (current >= plan.maxPatientsTotal) {
        throw new PlanLimitError("patients", current, plan.maxPatientsTotal);
      }
    }
    await incrementUsage(doctorId, month, "patients");
    return;
  }

  const usage = await getMonthlyUsage(doctorId, month);

  if (resource === "appointments" && plan.maxAppointmentsPerMonth !== null && plan.maxAppointmentsPerMonth !== undefined) {
    const current = usage?.appointmentsCount ?? 0;
    if (current >= plan.maxAppointmentsPerMonth) {
      throw new PlanLimitError("appointments", current, plan.maxAppointmentsPerMonth);
    }
  }

  if (resource === "sms" && plan.maxSmsPerMonth !== null && plan.maxSmsPerMonth !== undefined) {
    const current = usage?.smsCount ?? 0;
    if (current >= plan.maxSmsPerMonth) {
      throw new PlanLimitError("sms", current, plan.maxSmsPerMonth);
    }
  }

  await incrementUsage(doctorId, month, resource);
}

/**
 * Check if a feature key is enabled on the doctor's active plan.
 * Throws FeatureDisabledError (403) if not.
 * No-ops when the doctor has no active subscription (unrestricted).
 */
export async function assertFeatureEnabled(
  doctorId: string,
  feature: string
): Promise<void> {
  const plan = await getActivePlan(doctorId);
  if (!plan) return;

  const features = (plan.enabledFeatures as string[]) ?? [];
  if (features.length > 0 && !features.includes(feature)) {
    throw new FeatureDisabledError(feature);
  }
}

/**
 * Get the current plan info + usage for a doctor (used by the UI to show usage bars).
 */
export async function getDoctorPlanInfo(doctorId: string) {
  const plan = await getActivePlan(doctorId);
  if (!plan) return null;

  const month = currentMonth();
  const usage = await getMonthlyUsage(doctorId, month);

  return {
    planCode: plan.planCode,
    enabledFeatures: (plan.enabledFeatures as string[]) ?? [],
    limits: {
      appointments: { max: plan.maxAppointmentsPerMonth, used: usage?.appointmentsCount ?? 0 },
      sms: { max: plan.maxSmsPerMonth, used: usage?.smsCount ?? 0 },
      patients: { max: plan.maxPatientsTotal, used: usage?.patientsCount ?? 0 },
    },
  };
}
