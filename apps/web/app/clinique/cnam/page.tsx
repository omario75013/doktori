"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  BadgeCheck,
} from "lucide-react";

type CnamStat = {
  submittedThisMonth: number;
  reimbursedThisMonth: number;
  rejectedTotal: number;
  pendingAmountMillimes: number;
};

type CnamClaim = {
  id: string;
  consultationDate: string;
  patientInitials: string;
  doctorName: string;
  amountDt: string;
  status: string;
  daysOutstanding: number | null;
  reimbursedAt: string | null;
};

type ApiResponse = {
  stats: CnamStat;
  claims: CnamClaim[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumis",
  reimbursed: "Remboursé",
  rejected: "Rejeté",
};

const STATUS_PILL: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-cyan-100 text-cyan-700",
  reimbursed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  accent: string;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accent}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-3xl font-black mt-1.5 text-foreground tabular-nums">
            {value}
          </div>
          <div className="text-xs text-muted-foreground/70 mt-1">{sub}</div>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${iconColor}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

export default function CliniquesCnamPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const buildQs = useCallback(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    if (fromFilter) p.set("from", fromFilter);
    if (toFilter) p.set("to", toFilter);
    return p.toString() ? `?${p.toString()}` : "";
  }, [statusFilter, fromFilter, toFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinique/cnam${buildQs()}`);
      if (!res.ok) {
        const d = (await res.json()) as { error: string };
        throw new Error(d.error ?? "Erreur inconnue");
      }
      setData(await res.json() as ApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [buildQs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport(format: "csv" | "xlsx") {
    const p = new URLSearchParams();
    p.set("format", format);
    if (statusFilter) p.set("status", statusFilter);
    if (fromFilter) p.set("from", fromFilter);
    if (toFilter) p.set("to", toFilter);
    window.location.href = `/api/clinique/cnam?${p.toString()}`;
  }

  const stats = data?.stats;
  const claims = data?.claims ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <FileText className="w-5 h-5" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            <h1 className="text-2xl font-black text-foreground">CNAM</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Suivi des feuilles de soins
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            XLSX
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-doktori-teal-dark disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <KpiCard
            label="Soumis ce mois"
            value={stats.submittedThisMonth}
            sub="feuilles envoyées"
            icon={Clock}
            iconColor="#0891B2"
            accent="bg-cyan-500"
          />
          <KpiCard
            label="Approuvés ce mois"
            value={stats.reimbursedThisMonth}
            sub="remboursements reçus"
            icon={BadgeCheck}
            iconColor="#10b981"
            accent="bg-emerald-500"
          />
          <KpiCard
            label="Payés ce mois"
            value={stats.reimbursedThisMonth}
            sub="equivalent remboursés"
            icon={CheckCircle}
            iconColor="#6366f1"
            accent="bg-indigo-500"
          />
          <KpiCard
            label="Rejetés (total)"
            value={stats.rejectedTotal}
            sub="toutes périodes"
            icon={XCircle}
            iconColor="#ef4444"
            accent="bg-red-400"
          />
          <KpiCard
            label="Montant en attente"
            value={`${(stats.pendingAmountMillimes / 1000).toFixed(3)} DT`}
            sub="soumis non remboursés"
            icon={FileText}
            iconColor="#f59e0b"
            accent="bg-amber-400"
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 border border-border rounded-xl px-4 py-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="submitted">Soumis</option>
          <option value="reimbursed">Remboursé</option>
          <option value="rejected">Rejeté</option>
        </select>

        <input
          type="date"
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="De"
        />
        <span className="text-muted-foreground text-sm">—</span>
        <input
          type="date"
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="À"
        />

        {(statusFilter || fromFilter || toFilter) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setFromFilter("");
              setToFilter("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          Erreur : {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
          <h2 className="font-bold text-foreground">
            Feuilles de soins
          </h2>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {loading ? "…" : `${claims.length} feuille${claims.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm animate-pulse">
            Chargement…
          </div>
        ) : claims.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-muted-foreground text-sm">Aucune feuille de soins</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Patient
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Médecin
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Montant
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Jours
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payé le
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground tabular-nums whitespace-nowrap">
                      {c.consultationDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                          style={{ background: "#0891B2" }}
                        >
                          {c.patientInitials || "?"}
                        </div>
                        <span className="text-muted-foreground text-xs font-mono">
                          {c.patientInitials}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.doctorName}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {c.amountDt} DT
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_PILL[c.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.daysOutstanding != null ? (
                        <span
                          className={`text-xs font-semibold ${
                            c.daysOutstanding > 30 ? "text-red-500" : "text-muted-foreground"
                          }`}
                        >
                          {c.daysOutstanding}j
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {c.reimbursedAt ? c.reimbursedAt.slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
