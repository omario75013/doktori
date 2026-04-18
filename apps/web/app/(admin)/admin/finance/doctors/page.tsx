"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface DoctorBilling {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  subscription_id: string | null;
  plan: string | null;
  subscription_status: string | null;
  trial_end_date: string | null;
  price_millimes: number | null;
  total_consultations: number;
  total_revenue: number;
  total_commission: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  essentiel: "Essentiel",
  pro: "Pro",
  clinique: "Clinique",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  expired: "Expiré",
  cancelled: "Annulé",
  trial: "Essai",
};

const PLAN_BADGE: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  essentiel: "bg-blue-100 text-blue-700",
  pro: "bg-teal-100 text-teal-700",
  clinique: "bg-violet-100 text-violet-700",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  trial: "bg-orange-100 text-orange-700",
};

function formatDT(millimes: number | null): string {
  if (!millimes) return "0.000 DT";
  return (Number(millimes) / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

type Action = "extend_trial" | "activate_premium" | "suspend" | "reactivate";

const ACTION_LABELS: Record<Action, string> = {
  extend_trial: "Prolonger essai",
  activate_premium: "Activer Premium",
  suspend: "Suspendre",
  reactivate: "Réactiver",
};

export default function DoctorBillingPage() {
  const [doctors, setDoctors] = useState<DoctorBilling[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const limit = 50;

  const fetchDoctors = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search ? { search } : {}),
      ...(planFilter ? { plan: planFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    });

    fetch(`/api/admin/finance/doctors-billing?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { doctors: DoctorBilling[]; total: number }) => {
        setDoctors(data.doctors);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
        setLoading(false);
      });
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  async function handleAction(subscriptionId: string, action: Action) {
    if (!subscriptionId) {
      setActionMessage({ type: "error", text: "Aucun abonnement trouvé pour ce médecin" });
      return;
    }

    setActionLoading(`${subscriptionId}-${action}`);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { message?: string; error?: string };

      if (!res.ok) {
        setActionMessage({ type: "error", text: data.error ?? "Erreur inconnue" });
      } else {
        setActionMessage({ type: "success", text: data.message ?? "Action effectuée" });
        fetchDoctors();
      }
    } catch (e) {
      setActionMessage({ type: "error", text: e instanceof Error ? e.message : "Erreur réseau" });
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Facturation médecins</h1>
        <p className="text-slate-500 mt-1">Gestion des abonnements et revenus par médecin</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="">Tous les plans</option>
          {Object.entries(PLAN_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <button
          onClick={fetchDoctors}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>

        <span className="text-sm text-slate-500 ml-auto">{total} médecin{total !== 1 ? "s" : ""}</span>
      </div>

      {actionMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm border ${
            actionMessage.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
          Erreur de chargement : {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Médecin</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Fin essai</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Consultations</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Revenus</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Commission</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Chargement...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && doctors.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Aucun médecin trouvé
                  </td>
                </tr>
              )}

              {!loading && doctors.map((doc) => {
                const isLoadingAny = actionLoading?.startsWith(doc.subscription_id ?? "");
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{doc.name}</div>
                      <div className="text-xs text-slate-500">{doc.email}</div>
                      {!doc.is_active && (
                        <Badge label="Suspendu" className="mt-1 bg-red-100 text-red-700" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.plan ? (
                        <Badge
                          label={PLAN_LABELS[doc.plan] ?? doc.plan}
                          className={PLAN_BADGE[doc.plan] ?? "bg-slate-100 text-slate-600"}
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {doc.subscription_status ? (
                        <Badge
                          label={STATUS_LABELS[doc.subscription_status] ?? doc.subscription_status}
                          className={STATUS_BADGE[doc.subscription_status] ?? "bg-slate-100 text-slate-600"}
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {doc.trial_end_date
                        ? new Date(doc.trial_end_date).toLocaleDateString("fr-FR")
                        : "–"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{doc.total_consultations}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatDT(doc.total_revenue)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-teal-700">
                      {formatDT(doc.total_commission)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {doc.subscription_id && (
                          <>
                            <ActionButton
                              label={ACTION_LABELS.extend_trial}
                              loading={actionLoading === `${doc.subscription_id}-extend_trial`}
                              disabled={!!isLoadingAny}
                              onClick={() => handleAction(doc.subscription_id!, "extend_trial")}
                              variant="blue"
                            />
                            <ActionButton
                              label={ACTION_LABELS.activate_premium}
                              loading={actionLoading === `${doc.subscription_id}-activate_premium`}
                              disabled={!!isLoadingAny}
                              onClick={() => handleAction(doc.subscription_id!, "activate_premium")}
                              variant="teal"
                            />
                          </>
                        )}
                        {doc.is_active ? (
                          <ActionButton
                            label={ACTION_LABELS.suspend}
                            loading={actionLoading === `${doc.subscription_id}-suspend`}
                            disabled={!!isLoadingAny || !doc.subscription_id}
                            onClick={() => doc.subscription_id && handleAction(doc.subscription_id, "suspend")}
                            variant="red"
                          />
                        ) : (
                          <ActionButton
                            label={ACTION_LABELS.reactivate}
                            loading={actionLoading === `${doc.subscription_id}-reactivate`}
                            disabled={!!isLoadingAny || !doc.subscription_id}
                            onClick={() => doc.subscription_id && handleAction(doc.subscription_id, "reactivate")}
                            variant="green"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Page {page} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  loading,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  variant: "teal" | "blue" | "red" | "green";
}) {
  const variants = {
    teal: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100",
    blue: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    red: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    green: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-2 py-1 text-xs font-medium border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {loading ? "..." : label}
    </button>
  );
}
