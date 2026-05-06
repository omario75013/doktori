"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, RefreshCw, Banknote, Wallet } from "lucide-react";

interface PaymentRow {
  id: string;
  source: "appointment" | "subscription";
  source_id: string;
  paid_at: string | null;
  amount: number | null;
  provider: string | null;
  method: string | null;
  status: string | null;
  payment_ref: string | null;
  patient_id: string | null;
  patient_name: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  label: string;
}

interface ApiResponse {
  payments: PaymentRow[];
}

function formatDT(millimes: number | null | undefined): string {
  if (millimes == null) return "—";
  return (
    (millimes / 1000).toLocaleString("fr-TN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " DT"
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProviderBadge({ provider }: { provider: string | null }) {
  if (!provider) return <span className="text-xs text-slate-400">—</span>;
  const palette: Record<string, string> = {
    stripe: "bg-violet-50 text-violet-700",
    flouci: "bg-pink-50 text-pink-700",
    bank_transfer: "bg-blue-50 text-blue-700",
    cash: "bg-amber-50 text-amber-700",
    paymee: "bg-cyan-50 text-cyan-700",
    manual: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${palette[provider] ?? "bg-slate-100 text-slate-700"}`}>
      {provider}
    </span>
  );
}

export default function PaymentsLogPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (provider) params.set("provider", provider);
    if (method) params.set("method", method);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(`/api/admin/finance/payments?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [provider, method, from, to]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const total = data?.payments.reduce((acc, r) => acc + (r.amount ?? 0), 0) ?? 0;
  const apptCount = data?.payments.filter((r) => r.source === "appointment").length ?? 0;
  const subCount = data?.payments.filter((r) => r.source === "subscription").length ?? 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Historique des paiements</h1>
        </div>
        <p className="text-slate-500 ml-12">
          Vue unifiée des paiements : consultations + abonnements.
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total affiché</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatDT(total)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Consultations</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{apptCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-violet-50 text-violet-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Abonnements</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{subCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fournisseur</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm px-2 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tous</option>
            <option value="stripe">Stripe</option>
            <option value="flouci">Flouci</option>
            <option value="paymee">Paymee</option>
            <option value="bank_transfer">Virement</option>
            <option value="cash">Espèces</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Méthode</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm px-2 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Toutes</option>
            <option value="stripe_card">Carte Stripe</option>
            <option value="bank_transfer">Virement</option>
            <option value="cash_on_premises">Espèces sur place</option>
            <option value="flouci">Flouci</option>
            <option value="paymee">Paymee</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm px-2 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm px-2 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          onClick={() => void fetchData()}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
          Erreur de chargement : {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Médecin</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Fournisseur</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Méthode</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Montant</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Réf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Aucun paiement.
                  </td>
                </tr>
              ) : (
                data?.payments.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(row.paid_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{row.label}</p>
                      <p className="text-xs text-slate-400">{row.source === "appointment" ? "RDV" : "Abonnement"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.doctor_name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.patient_name ?? "—"}</td>
                    <td className="px-4 py-3"><ProviderBadge provider={row.provider} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.method ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatDT(row.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500" title={row.payment_ref ?? ""}>
                      {row.payment_ref ? row.payment_ref.slice(0, 14) + "…" : "—"}
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
