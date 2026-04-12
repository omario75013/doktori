"use client";

import useSWR from "swr";
import Link from "next/link";
import { AlertTriangle, Clock, Siren, MessageSquare } from "lucide-react";

type Kpis = {
  doctors: { pending: number };
  appointments: { pending: number };
  reviews: { pending: number };
  sos: { inProgress: number };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AlertBanners() {
  const { data } = useSWR<Kpis>("/api/admin/kpis", fetcher, {
    refreshInterval: 5000,
  });

  if (!data) return null;

  const alerts: Array<{
    icon: typeof AlertTriangle;
    label: string;
    href: string;
    count: number;
    tone: "amber" | "red" | "pink";
  }> = [];

  if (data.doctors.pending > 0) {
    alerts.push({
      icon: Clock,
      label: `${data.doctors.pending} médecin${
        data.doctors.pending > 1 ? "s" : ""
      } en attente de validation`,
      href: "/admin/validation",
      count: data.doctors.pending,
      tone: "amber",
    });
  }
  if (data.reviews.pending > 0) {
    alerts.push({
      icon: MessageSquare,
      label: `${data.reviews.pending} avis à modérer`,
      href: "/admin/reviews",
      count: data.reviews.pending,
      tone: "pink",
    });
  }
  if (data.sos.inProgress > 0) {
    alerts.push({
      icon: Siren,
      label: `${data.sos.inProgress} session${
        data.sos.inProgress > 1 ? "s" : ""
      } SOS en cours`,
      href: "/admin",
      count: data.sos.inProgress,
      tone: "red",
    });
  }

  if (alerts.length === 0) return null;

  const toneStyles = {
    amber: "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100",
    red: "bg-red-50 border-red-200 text-red-900 hover:bg-red-100",
    pink: "bg-pink-50 border-pink-200 text-pink-900 hover:bg-pink-100",
  };

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            href={a.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${toneStyles[a.tone]}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium flex-1">{a.label}</span>
            <span className="text-xs font-semibold opacity-70">Voir →</span>
          </Link>
        );
      })}
    </div>
  );
}
