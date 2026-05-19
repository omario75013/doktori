import { db, subscriptionPlans } from "@doktori/db";
import { asc, desc } from "drizzle-orm";
import { PlansClient } from "./plans-client";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const rows = await db
    .select()
    .from(subscriptionPlans)
    .orderBy(desc(subscriptionPlans.isActive), asc(subscriptionPlans.displayOrder));

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Plans d&apos;abonnement</h1>
        <p className="text-slate-500 mt-1">
          Créez et gérez les plans pour médecins, cliniques et laboratoires.
        </p>
      </div>
      <PlansClient
        plans={rows.map((p) => ({
          id: p.id,
          code: p.code,
          label: p.label,
          priceMillimes: p.priceMillimes,
          billingCycle: p.billingCycle,
          targetType: p.targetType,
          description: p.description,
          features: p.features ?? [],
          enabledFeatures: p.enabledFeatures ?? [],
          maxAppointmentsPerMonth: p.maxAppointmentsPerMonth,
          maxSmsPerMonth: p.maxSmsPerMonth,
          maxPatientsTotal: p.maxPatientsTotal,
          extraRules: p.extraRules ?? {},
          displayOrder: p.displayOrder,
          isActive: p.isActive,
        }))}
      />
    </div>
  );
}
