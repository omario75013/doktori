"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Mail, AlertCircle, CheckCircle2, Info } from "lucide-react";

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  provider: string;
  created_at: string;
}

interface ApiResponse {
  emails: EmailLog[];
  total: number;
  page: number;
  pageSize: number;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Envoyé
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
          <AlertCircle className="w-3 h-3" />
          Échec
        </span>
      );
    case "dev_logged":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <Info className="w-3 h-3" />
          Dev
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          {status}
        </span>
      );
  }
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

export default function EmailLogsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/communications/emails?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as ApiResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [page, status, from, to, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleFilterChange() {
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Emails envoyés</h1>
        </div>
        <p className="text-slate-500 ml-12">Journal des emails transactionnels et de diffusion</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); handleFilterChange(); }}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tous</option>
            <option value="sent">Envoyé</option>
            <option value="failed">Échec</option>
            <option value="dev_logged">Dev</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); handleFilterChange(); }}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); handleFilterChange(); }}
            className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un destinataire…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 w-64 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            Rechercher
          </button>
        </form>
      </div>

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
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Destinataire</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Sujet</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : data?.emails.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    Aucun email trouvé
                  </td>
                </tr>
              ) : (
                data?.emails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{email.recipient}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={email.subject}>
                      {email.subject}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(email.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {data.total.toLocaleString("fr-FR")} résultats au total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-700 font-medium">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
