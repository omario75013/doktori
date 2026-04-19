"use client";

import { useState, useEffect } from "react";
import { Receipt, Download, AlertCircle } from "lucide-react";

interface Invoice {
  id: string;
  plan: string;
  status: string;
  priceMillimes: number;
  billingCycle: string;
  paymentProvider: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  invoiceNumber: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  essentiel: "Essentiel",
  pro: "Pro",
  clinique: "Clinique",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-100 text-green-700" },
  expired: { label: "Expiré", className: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Annulé", className: "bg-red-100 text-red-600" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(millimes: number): string {
  return (millimes / 1000).toFixed(3).replace(".", ",") + " DT";
}

export default function FacturesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctor/invoices")
      .then((r) => {
        if (!r.ok) throw new Error("Impossible de charger les factures.");
        return r.json();
      })
      .then((data: Invoice[]) => setInvoices(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDownload(invoice: Invoice) {
    setDownloading(invoice.id);
    try {
      const res = await fetch(
        `/api/doctor/invoices/${invoice.id}/download`
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Erreur lors du téléchargement.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${invoice.invoiceNumber}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue.";
      setError(message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-sm text-gray-500">
            Téléchargez vos factures d&apos;abonnement Doktori.
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            className="ml-auto text-red-400 hover:text-red-600 text-xs underline"
            onClick={() => setError(null)}
          >
            Fermer
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-teal-600 py-12 justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm font-medium">Chargement des factures…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && invoices.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Receipt className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            Aucune facture disponible pour le moment.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Vos factures apparaîtront ici dès qu&apos;un abonnement sera activé.
          </p>
        </div>
      )}

      {/* Invoice list */}
      {!loading && invoices.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  N° Facture
                </th>
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Plan
                </th>
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Période
                </th>
                <th className="px-5 py-3.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Montant TTC
                </th>
                <th className="px-5 py-3.5 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Statut
                </th>
                <th className="px-5 py-3.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const statusMeta = STATUS_LABELS[inv.status] ?? {
                  label: inv.status,
                  className: "bg-gray-100 text-gray-600",
                };
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-gray-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-4 text-gray-800 font-medium">
                      {PLAN_LABELS[inv.plan] ?? inv.plan}
                      <span className="ml-1.5 text-gray-400 text-xs font-normal">
                        ({inv.billingCycle === "annual" ? "annuel" : "mensuel"})
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {inv.startsAt ? (
                        <>
                          {formatDate(inv.startsAt)}
                          {inv.endsAt && (
                            <span className="text-gray-400">
                              {" "}→ {formatDate(inv.endsAt)}
                            </span>
                          )}
                        </>
                      ) : (
                        formatDate(inv.createdAt)
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-800 tabular-nums">
                      {formatAmount(inv.priceMillimes)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDownload(inv)}
                        disabled={downloading === inv.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
                        title="Télécharger la facture"
                      >
                        {downloading === inv.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {downloading === inv.id ? "…" : "Télécharger"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legal note */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Factures émises par Random Walkers SUARL — RNE 1625867B — MF
            1625867/B/A/M/000. Paiement via Flouci. Factures générées
            automatiquement.
          </div>
        </div>
      )}
    </div>
  );
}
