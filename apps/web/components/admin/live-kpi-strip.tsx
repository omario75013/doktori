"use client";

import useSWR from "swr";
import {
  Stethoscope,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  MessageSquare,
  CreditCard,
  Siren,
  Wallet,
} from "lucide-react";

type Kpis = {
  doctors: { total: number; active: number; pending: number };
  patients: { total: number; today: number; week: number };
  appointments: { today: number; week: number; pending: number };
  reviews: { pending: number };
  subscriptions: { active: number; mrrMillimes: number };
  sos: { inProgress: number };
  at: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDt(millimes: number) {
  return `${(millimes / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT`;
}

export function LiveKpiStrip() {
  const { data, isLoading } = useSWR<Kpis>("/api/admin/kpis", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  const cards = [
    {
      label: "Médecins total",
      value: data?.doctors.total ?? "—",
      icon: Stethoscope,
      accent: "from-teal-500 to-teal-600",
    },
    {
      label: "Médecins actifs",
      value: data?.doctors.active ?? "—",
      icon: CheckCircle2,
      accent: "from-green-500 to-green-600",
    },
    {
      label: "En attente",
      value: data?.doctors.pending ?? "—",
      icon: Clock,
      accent: "from-amber-500 to-amber-600",
    },
    {
      label: "Patients total",
      value: data?.patients.total ?? "—",
      icon: Users,
      accent: "from-blue-500 to-blue-600",
    },
    {
      label: "Nouveaux 7j",
      value: data?.patients.week ?? "—",
      icon: TrendingUp,
      accent: "from-sky-500 to-sky-600",
    },
    {
      label: "RDV aujourd'hui",
      value: data?.appointments.today ?? "—",
      icon: Calendar,
      accent: "from-purple-500 to-purple-600",
    },
    {
      label: "RDV 7j",
      value: data?.appointments.week ?? "—",
      icon: Calendar,
      accent: "from-fuchsia-500 to-fuchsia-600",
    },
    {
      label: "Avis à modérer",
      value: data?.reviews.pending ?? "—",
      icon: MessageSquare,
      accent: "from-pink-500 to-pink-600",
    },
    {
      label: "Abonnements actifs",
      value: data?.subscriptions.active ?? "—",
      icon: CreditCard,
      accent: "from-indigo-500 to-indigo-600",
    },
    {
      label: "MRR",
      value: data ? formatDt(data.subscriptions.mrrMillimes) : "—",
      icon: Wallet,
      accent: "from-emerald-500 to-emerald-600",
    },
    {
      label: "SOS en cours",
      value: data?.sos.inProgress ?? "—",
      icon: Siren,
      accent: "from-red-500 to-red-600",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Indicateurs en direct
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className={`w-2 h-2 rounded-full ${
              isLoading ? "bg-slate-300" : "bg-green-500 animate-pulse"
            }`}
          />
          {isLoading ? "Chargement…" : "Live"}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 truncate">{c.label}</p>
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {c.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
