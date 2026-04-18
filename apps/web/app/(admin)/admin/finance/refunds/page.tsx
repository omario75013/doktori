"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, CreditCard } from "lucide-react";

interface RefundRow {
  id: string;
  payment_status: "refund_pending" | "refunded";
  payment_amount: number | null;
  payment_provider: string | null;
  payment_ref: string | null;
  starts_at: string;
  updated_at: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
}

interface ApiResponse {
  refunds: RefundRow[];
}

function formatDT(millimes: number | null): string {
  if (millimes == null) return "—";
  return (millimes / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: "refund_pending" | "refunded" }) {
  if (status === "refund_pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
        <Clock className="w-3 h-3" />
        En attente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
      <CheckCircle2 className="w-3 h-3" />
      Remboursé
    </span>
  );
}

export default function RefundsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/admin/finance/refunds?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as ApiResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleMarkRefunded(appointmentId: string) {
    setConfirming(appointmentId);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/finance/refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      // Optimistically update the row
      setData((prev) =>
        prev
          ? {
              ...prev,
              refunds: prev.refunds.map((r) =>
                r.id === appointmentId ? { ...r, payment_status: "refunded" } : r
              ),
            }
          : prev
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setConfirming(null);
    }
  }

  const pendingCount = data?.refunds.filter((r) => r.payment_status === "refund_pending").length ?? 0;
  const refundedCount = data?.refunds.filter((r) => r.payment_status === "refunded").length ?? 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Remboursements</h1>
        </div>
        <p className="text-slate-500 ml-12">Suivi et validation des remboursements patients</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">En attente</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Remboursés</p>
          <p className="text-2xl font-bold text-green-600">{refundedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total affiché</p>
          <p className="text-2xl font-bold text-slate-900">{data?.refunds.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Montant en attente</p>
          <p className="text-lg font-bold text-slate-900">
            {formatDT(
              data?.refunds
                .filter((r) => r.payment_status === "refund_pending")
                .reduce((acc, r) => acc + (r.payment_amount ?? 0), 0) ?? 0
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tous</option>
            <option value="refund_pending">En attente</option>
            <option value="refunded">Remboursés</option>
          </select>
        </div>
        <button
          onClick={() => void fetchData()}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-sm text-red-700">
            Erreur de chargement : {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">RDV</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Médecin</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Montant</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date RDV</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.refunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Aucun remboursement trouvé
                  </td>
                </tr>
              ) : (
                data?.refunds.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500" title={row.id}>
                      {row.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.patient_name}</p>
                      <p className="text-xs text-slate-400">{row.patient_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{row.doctor_name}</p>
                      <p className="text-xs text-slate-400">{row.doctor_specialty}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatDT(row.payment_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(row.starts_at)}
                    </td>
                    <td className="px-4 py-3">
                      {row.payment_status === "refund_pending" ? (
                        <button
                          onClick={() => void handleMarkRefunded(row.id)}
                          disabled={confirming === row.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {confirming === row.id ? (
                            <div className="w-3 h-3 border-2 border-green-400/30 border-t-green-600 rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Marquer comme remboursé
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
