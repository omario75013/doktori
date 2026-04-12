"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditLog = {
  id: string;
  actorId: string | null;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

const RESOURCE_TYPES = [
  "admin_users",
  "doctors",
  "patients",
  "appointments",
  "reviews",
  "clinics",
  "subscriptions",
  "sos",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(str: string | null, max = 50): string {
  if (!str) return "—";
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

function exportCsv(logs: AuditLog[]) {
  const header = [
    "id",
    "actorEmail",
    "action",
    "resourceType",
    "resourceId",
    "reason",
    "ip",
    "createdAt",
  ];
  const rows = logs.map((l) =>
    [
      l.id,
      l.actorEmail,
      l.action,
      l.resourceType,
      l.resourceId ?? "",
      l.reason ?? "",
      l.ip ?? "",
      l.createdAt,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Row with expandable diff ─────────────────────────────────────────────────

function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = log.before !== null || log.after !== null;

  return (
    <>
      <tr
        className={`hover:bg-slate-50 transition-colors ${hasDiff ? "cursor-pointer" : ""}`}
        onClick={() => hasDiff && setExpanded((v) => !v)}
      >
        <td className="px-4 py-2.5">
          {hasDiff ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )
          ) : (
            <span className="w-3.5 h-3.5 inline-block" />
          )}
        </td>
        <td className="px-4 py-2.5 text-slate-600 text-xs">{log.actorEmail}</td>
        <td className="px-4 py-2.5 font-mono text-xs text-slate-800">
          {log.action}
        </td>
        <td className="px-4 py-2.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            {log.resourceType}
          </span>
        </td>
        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
          {truncate(log.resourceId, 32) || "—"}
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-500">
          {truncate(log.reason)}
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
          {fmtDate(log.createdAt)}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-6 pb-4 pt-0">
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Avant
                </p>
                <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-auto max-h-60 text-slate-700">
                  {log.before !== null
                    ? JSON.stringify(log.before, null, 2)
                    : "null"}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Après
                </p>
                <pre className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-auto max-h-60 text-slate-700">
                  {log.after !== null
                    ? JSON.stringify(log.after, null, 2)
                    : "null"}
                </pre>
              </div>
            </div>
            {log.userAgent && (
              <p className="mt-2 text-xs text-slate-400 truncate">
                UA: {log.userAgent}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditExplorerPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filters
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const buildUrl = useCallback(
    (p: number) => {
      const params = new URLSearchParams();
      if (actor) params.set("actor", actor);
      if (action) params.set("action", action);
      if (resourceType) params.set("resourceType", resourceType);
      if (q) params.set("q", q);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", String(p));
      params.set("limit", "50");
      return `/api/admin/access/audit?${params.toString()}`;
    },
    [actor, action, resourceType, q, from, to]
  );

  const fetchLogs = useCallback(
    async (p: number) => {
      setIsLoading(true);
      try {
        const res = await fetch(buildUrl(p));
        const data = await res.json();
        setLogs(data.logs ?? []);
        setPage(p);
      } finally {
        setIsLoading(false);
      }
    },
    [buildUrl]
  );

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchLogs(1);
  }

  function handleReset() {
    setActor("");
    setAction("");
    setResourceType("");
    setQ("");
    setFrom("");
    setTo("");
    // Trigger fetch after state updates
    setTimeout(() => fetchLogs(1), 0);
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Explorateur d'audit
          </h1>
          <p className="text-slate-500 mt-1">
            Historique de toutes les actions administrateurs
          </p>
        </div>
        <button
          onClick={() => exportCsv(logs)}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-xl border border-slate-200 p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Filtres</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Acteur (email)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="email…"
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Action
            </label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="ex: patients.suspend"
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Type de ressource
            </label>
            <div className="relative">
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white"
              >
                <option value="">Tous</option>
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Recherche (ID)
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="resourceId…"
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Du
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Au
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Rechercher
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {isLoading ? "Chargement…" : `${logs.length} entrée${logs.length > 1 ? "s" : ""}`}
            {logs.length === 50 && (
              <span className="text-slate-400"> (page {page})</span>
            )}
          </p>
          {logs.length === 50 && (
            <div className="flex gap-2">
              {page > 1 && (
                <button
                  onClick={() => fetchLogs(page - 1)}
                  className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Précédent
                </button>
              )}
              <button
                onClick={() => fetchLogs(page + 1)}
                className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 font-medium">Acteur</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">ID ressource</th>
                <th className="px-4 py-3 font-medium">Raison</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Chargement…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Aucune entrée pour ces critères
                  </td>
                </tr>
              ) : (
                logs.map((log) => <AuditRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {logs.length === 50 && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
            {page > 1 && (
              <button
                onClick={() => fetchLogs(page - 1)}
                className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Précédent
              </button>
            )}
            <button
              onClick={() => fetchLogs(page + 1)}
              className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
