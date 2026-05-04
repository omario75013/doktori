"use client";

import useSWR from "swr";
import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Wallet,
  UserPlus,
  Stethoscope,
  Siren,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

type KpiPair = { value: number; vsYesterdayPct: number | null };

type LiveKpis = {
  appointmentsToday: KpiPair;
  appointmentsCompletedToday: KpiPair;
  revenueTodayTnd: KpiPair;
  newPatientsToday: KpiPair;
  newDoctorsPending: KpiPair;
  sosActiveCount: KpiPair;
  smsSent24h: KpiPair;
  errors24hCount: KpiPair;
  at: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) {
    return null;
  }
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  label,
  pair,
  icon: Icon,
  format = "int",
  hideDelta = false,
}: {
  label: string;
  pair: KpiPair | undefined;
  icon: React.ComponentType<{ className?: string }>;
  format?: "int" | "money" | "decimal";
  hideDelta?: boolean;
}) {
  const lastValueRef = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!pair) return;
    if (lastValueRef.current !== null && lastValueRef.current !== pair.value) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
    lastValueRef.current = pair.value;
  }, [pair?.value, pair]);

  const display =
    pair === undefined
      ? "—"
      : format === "money"
        ? `${pair.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT`
        : format === "decimal"
          ? pair.value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })
          : pair.value.toLocaleString("fr-FR");

  return (
    <div
      className={`relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all ${
        pulse ? "ring-2 ring-teal-400 ring-offset-2" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {display}
          </p>
          {!hideDelta && pair && <div className="mt-1"><Delta pct={pair.vsYesterdayPct} /></div>}
        </div>
        <div className="h-9 w-9 shrink-0 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function LiveKpisGrid() {
  const { data } = useSWR<LiveKpis>("/api/admin/live-kpis", fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  const lastUpdated = data?.at
    ? new Date(data.at).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">KPIs en direct</h2>
          <p className="text-xs text-slate-500">
            Rafraîchi automatiquement toutes les 10 secondes
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tabular-nums">Mis à jour à {lastUpdated}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard
          label="RDV aujourd'hui"
          pair={data?.appointmentsToday}
          icon={Calendar}
        />
        <KpiCard
          label="RDV complétés"
          pair={data?.appointmentsCompletedToday}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Revenus jour"
          pair={data?.revenueTodayTnd}
          icon={Wallet}
          format="money"
        />
        <KpiCard
          label="Nouveaux patients"
          pair={data?.newPatientsToday}
          icon={UserPlus}
        />
        <KpiCard
          label="Médecins à valider"
          pair={data?.newDoctorsPending}
          icon={Stethoscope}
          hideDelta
        />
        <KpiCard
          label="SOS en cours"
          pair={data?.sosActiveCount}
          icon={Siren}
          hideDelta
        />
        <KpiCard
          label="SMS 24h"
          pair={data?.smsSent24h}
          icon={MessageSquare}
        />
        <KpiCard
          label="Erreurs 24h"
          pair={data?.errors24hCount}
          icon={AlertTriangle}
        />
      </div>
    </section>
  );
}
