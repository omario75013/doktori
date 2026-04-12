"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, CheckCircle2, XCircle, Clock, Send } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SmsStatus = "pending" | "sent" | "delivered" | "failed";

type SmsLog = {
  id: string;
  recipient: string;
  message: string;
  status: SmsStatus;
  provider: string | null;
  cost: number | null;
  appointmentId: string | null;
  createdAt: string;
};

type Stats = {
  totalSent: number;
  deliveryRate: number | null;
  monthlyCostDT: string;
  monthlySent: number;
};

type Filters = {
  statuses: SmsStatus[];
  from: string;
  to: string;
  recipient: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskRecipient(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "•") + phone.slice(-4);
}

function truncateMessage(msg: string, max = 60): string {
  return msg.length > max ? msg.slice(0, max) + "…" : msg;
}

function formatCostDT(millimes: number | null): string {
  if (millimes == null) return "—";
  return (millimes / 1000).toFixed(3) + " DT";
}

const STATUS_LABELS: Record<SmsStatus, string> = {
  pending: "En attente",
  sent: "Envoyé",
  delivered: "Livré",
  failed: "Échoué",
};

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SmsStatus }) {
  const styles: Record<SmsStatus, string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    sent: "bg-blue-50 text-blue-700 ring-blue-200",
    delivered: "bg-green-50 text-green-700 ring-green-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
  };
  const icons: Record<SmsStatus, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    sent: <Send className="w-3 h-3" />,
    delivered: <CheckCircle2 className="w-3 h-3" />,
    failed: <XCircle className="w-3 h-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {icons[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatsBar({ stats }: { stats: Stats | null }) {
  const items = [
    {
      label: "Total envoyés",
      value: stats ? stats.totalSent.toLocaleString("fr-FR") : "—",
    },
    {
      label: "Taux de livraison",
      value: stats?.deliveryRate != null ? `${stats.deliveryRate}%` : "—",
    },
    {
      label: "Coût ce mois (DT)",
      value: stats ? stats.monthlyCostDT : "—",
    },
    {
      label: "Livrés ce mois",
      value: stats ? stats.monthlySent.toLocaleString("fr-FR") : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

function FiltersBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  function toggleStatus(s: SmsStatus) {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-6">
      {/* Status */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Statut</p>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "sent", "delivered", "failed"] as SmsStatus[]).map((s) => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.statuses.includes(s)}
                onChange={() => toggleStatus(s)}
                className="rounded accent-teal-600"
              />
              <span className="text-sm text-slate-700">{STATUS_LABELS[s]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Période</p>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-slate-400 text-sm">→</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Recipient search */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Destinataire</p>
        <input
          type="text"
          value={filters.recipient}
          onChange={(e) => onChange({ ...filters, recipient: e.target.value })}
          placeholder="Numéro de téléphone…"
          className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSmsLogsPage() {
  const [filters, setFilters] = useState<Filters>({
    statuses: [],
    from: "",
    to: "",
    recipient: "",
  });
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/communications/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const loadLogs = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.recipient) params.set("recipient", filters.recipient);
      params.set("page", String(pageNum));

      const res = await fetch(`/api/admin/communications/sms?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setLogs(data.logs);
        } else {
          setLogs((prev) => [...prev, ...data.logs]);
        }
        setHasMore(data.hasMore);
      }
      setLoading(false);
    },
    [filters]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPage(1);
    loadLogs(1);
  }, [loadLogs]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    loadLogs(next);
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Logs SMS</h1>
        </div>
        <p className="text-slate-500 ml-12">
          Historique de tous les SMS envoyés via la plateforme.
        </p>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <FiltersBar filters={filters} onChange={setFilters} />

      {/* Table */}
      {loading && logs.length === 0 ? (
        <p className="text-slate-400 text-sm">Chargement…</p>
      ) : logs.length === 0 ? (
        <p className="text-slate-400 text-sm bg-white rounded-xl border border-slate-200 p-8 text-center">
          Aucun SMS pour ces filtres.
        </p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Destinataire</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Message</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Fournisseur</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Coût</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {maskRecipient(log.recipient)}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p
                        className="text-slate-700 truncate"
                        title={log.message}
                      >
                        {truncateMessage(log.message)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status as SmsStatus} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.provider ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatCostDT(log.cost)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-5 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {loading ? "Chargement…" : "Charger plus"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
