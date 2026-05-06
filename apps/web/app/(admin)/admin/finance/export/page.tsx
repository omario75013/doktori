"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Info } from "lucide-react";

type ExportType = "all" | "appointments" | "subscriptions" | "refunds";

export default function FinanceExportPage() {
  const [type, setType] = useState<ExportType>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    setDownloading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("type", type);
      params.set("format", format);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/admin/finance/export?${params.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(((j as { error?: string }).error) ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doktori-finance-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Export financier</h1>
        </div>
        <p className="text-slate-500 ml-12">
          Exporter les données financières (consultations, abonnements, remboursements).
        </p>
      </div>

      <form onSubmit={(e) => { void handleDownload(e); }} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Type de données</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["all", "appointments", "subscriptions", "refunds"] as ExportType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  type === t
                    ? "bg-orange-50 border-orange-300 text-orange-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "all" && "Tout"}
                {t === "appointments" && "Consultations"}
                {t === "subscriptions" && "Abonnements"}
                {t === "refunds" && "Remboursements"}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                format === "csv"
                  ? "bg-orange-50 border-orange-300 text-orange-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => setFormat("xlsx")}
              disabled
              className="px-3 py-2 text-sm font-medium rounded-lg border bg-white border-slate-200 text-slate-300 cursor-not-allowed"
              title="Disponible dans une prochaine version"
            >
              XLSX (V2)
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            L'export est limité à 10 000 lignes par section. Chaque téléchargement est journalisé dans le journal d'audit.
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {downloading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Télécharger
        </button>
      </form>
    </div>
  );
}
