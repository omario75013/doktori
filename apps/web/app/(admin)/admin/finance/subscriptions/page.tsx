"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  price_millimes: number;
  starts_at: string | null;
  ends_at: string | null;
  doctor_name: string | null;
  doctor_email: string | null;
}

interface ApiResponse {
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
}

const PLAN_OPTIONS = ["free", "essentiel", "pro", "clinique"] as const;
const STATUS_OPTIONS = ["pending", "active", "expired", "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  expired: "Expiré",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  expired: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-50 text-red-700",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  essentiel: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
  clinique: "bg-teal-50 text-teal-700",
};

function formatDT(millimes: number): string {
  return (millimes / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
}

async function fetcher(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<ApiResponse>;
}

export default function AdminSubscriptionsPage() {
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "50");
    if (planFilter) p.set("plan", planFilter);
    if (statusFilter) p.set("status", statusFilter);
    return p.toString();
  }, [page, planFilter, statusFilter]);

  const { data, isLoading } = useSWR<ApiResponse>(
    `/api/admin/finance/subscriptions?${queryParams}`,
    fetcher
  );

  const subscriptions = data?.subscriptions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  function resetFilters() {
    setPlanFilter("");
    setStatusFilter("");
    setPage(1);
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-2">
        <Link
          href="/admin/finance"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Finance
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Abonnements</h1>
          <p className="text-slate-500 mt-1">{total} abonnement{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1.5">Plan</label>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tous les plans</option>
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1.5">Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {(planFilter || statusFilter) && (
          <button
            onClick={resetFilters}
            className="text-sm text-slate-500 hover:text-slate-900 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Médecin</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Cycle</th>
                <th className="px-4 py-3 font-semibold">Montant</th>
                <th className="px-4 py-3 font-semibold">Début</th>
                <th className="px-4 py-3 font-semibold">Fin</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && subscriptions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Aucun abonnement trouvé
                  </td>
                </tr>
              )}
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{s.doctor_name ?? "—"}</div>
                    {s.doctor_email && (
                      <div className="text-xs text-slate-400">{s.doctor_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PLAN_COLORS[s.plan] ?? "bg-slate-100 text-slate-600"}`}>
                      {s.plan.charAt(0).toUpperCase() + s.plan.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{s.billing_cycle}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatDT(s.price_millimes)}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {s.starts_at ? new Date(s.starts_at).toLocaleDateString("fr-TN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {s.ends_at ? new Date(s.ends_at).toLocaleDateString("fr-TN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/finance/subscriptions/${s.id}`}
                      className="text-xs font-medium text-teal-700 hover:underline"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
            <span>Page {page} / {totalPages} — {total} abonnements</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
