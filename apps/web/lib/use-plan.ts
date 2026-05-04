"use client";

import { useEffect, useState } from "react";

export type PlanInfo = {
  planCode: string | null;
  enabledFeatures: string[];
  limits: {
    maxAppointmentsPerMonth: number | null;
    maxSmsPerMonth: number | null;
    maxPatientsTotal: number | null;
  };
  usage: {
    appointmentsCount: number;
    smsCount: number;
    patientsCount: number;
  };
};

const EMPTY: PlanInfo = {
  planCode: null,
  enabledFeatures: [],
  limits: { maxAppointmentsPerMonth: null, maxSmsPerMonth: null, maxPatientsTotal: null },
  usage: { appointmentsCount: 0, smsCount: 0, patientsCount: 0 },
};

let cached: PlanInfo | null = null;
let cacheAt = 0;
const TTL = 60_000; // 1 minute

export function usePlan() {
  const [plan, setPlan] = useState<PlanInfo>(cached ?? EMPTY);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached && Date.now() - cacheAt < TTL) {
      setPlan(cached);
      setLoading(false);
      return;
    }
    fetch("/api/doctor/plan")
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((data: PlanInfo) => {
        cached = data;
        cacheAt = Date.now();
        setPlan(data);
      })
      .catch(() => setPlan(EMPTY))
      .finally(() => setLoading(false));
  }, []);

  function hasFeature(feature: string): boolean {
    // null enabledFeatures means no plan — allow everything
    if (plan.enabledFeatures.length === 0 && !plan.planCode) return true;
    return plan.enabledFeatures.includes(feature);
  }

  function isAtLimit(resource: "appointments" | "sms" | "patients"): boolean {
    const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}${resource === "appointments" ? "PerMonth" : resource === "sms" ? "PerMonth" : "Total"}` as keyof PlanInfo["limits"];
    const usageKey = `${resource}Count` as keyof PlanInfo["usage"];
    const limit = plan.limits[limitKey];
    if (limit === null) return false;
    return plan.usage[usageKey] >= limit;
  }

  function usagePercent(resource: "appointments" | "sms" | "patients"): number | null {
    const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}${resource === "appointments" ? "PerMonth" : resource === "sms" ? "PerMonth" : "Total"}` as keyof PlanInfo["limits"];
    const usageKey = `${resource}Count` as keyof PlanInfo["usage"];
    const limit = plan.limits[limitKey];
    if (!limit) return null;
    return Math.min(100, Math.round((plan.usage[usageKey] / limit) * 100));
  }

  return { plan, loading, hasFeature, isAtLimit, usagePercent };
}
