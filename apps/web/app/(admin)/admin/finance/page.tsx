"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Users, UserPlus, UserMinus, CreditCard, ListOrdered, BarChart3, Receipt } from "lucide-react";

interface OverviewStats {
  active_subscriptions: number;
  mrr_millimes: number;
  new_this_month: number;
  churned_this_month: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function formatDT(millimes: number): string {
  return (millimes / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
}

export default function AdminFinancePage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/finance/overview")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: OverviewStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Finance</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble des abonnements et revenus</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-28 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-8 text-sm">
          Erreur de chargement : {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Abonnements actifs"
            value={stats.active_subscriptions}
            icon={Users}
            color="bg-teal-50 text-teal-600"
          />
          <StatCard
            title="MRR"
            value={formatDT(Number(stats.mrr_millimes))}
            icon={TrendingUp}
            color="bg-emerald-50 text-emerald-600"
            sub="Revenus mensuels récurrents"
          />
          <StatCard
            title="Nouveaux ce mois"
            value={stats.new_this_month}
            icon={UserPlus}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Churned ce mois"
            value={stats.churned_this_month}
            icon={UserMinus}
            color="bg-red-50 text-red-600"
          />
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <Link
          href="/admin/finance/subscriptions"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
              Abonnements
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Liste complète des abonnements médecins avec filtres par plan et statut.
          </p>
        </Link>

        <Link
          href="/admin/finance/plans"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <ListOrdered className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
              Catalogue des plans
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Gérer les plans tarifaires : libellés, prix, fonctionnalités et ordre d'affichage.
          </p>
        </Link>

        <Link
          href="/admin/finance/revenue"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Revenus
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Commissions SOS et téléconsultation, tendances mensuelles et top médecins.
          </p>
        </Link>

        <Link
          href="/admin/finance/doctors"
          className="bg-white rounded-xl border border-slate-200 p-6 hover:border-teal-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-orange-700 transition-colors">
              Facturation médecins
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Gérer les abonnements médecins : prolonger, activer, suspendre ou réactiver.
          </p>
        </Link>
      </div>
    </div>
  );
}
