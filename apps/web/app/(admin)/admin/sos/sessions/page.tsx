"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Search, Download, Star } from "lucide-react";

interface SosSession {
  id: string;
  status: string;
  symptom_category: string | null;
  patient_name: string | null;
  doctor_name: string | null;
  fee: number | null;
  commission: number | null;
  distance_m: number | null;
  resolution: string | null;
  requested_at: string;
  duration_ms: number | null;
  review_rating: number | null;
}

interface ApiResponse {
  sessions: SosSession[];
  total: number;
  page: number;
  limit: number;
}

import {
  sosFetcher as fetcher,
  SOS_STATUS_LABELS as STATUS_LABELS,
  SOS_STATUS_COLORS as STATUS_COLORS,
  SYMPTOM_OPTIONS as SYMPTOM_LIST,
  formatDT,
  formatDuration,
} from "@/lib/sos-constants";
import { StarRating } from "@/components/star-rating";

const SYMPTOM_OPTIONS = SYMPTOM_LIST.map((s) => s.label);

function exportCsv(sessions: SosSession[]) {
  const headers = [
    "ID", "Statut", "Patient", "Médecin", "Symptôme",
    "Honoraire (DT)", "Commission (DT)", "Distance (m)", "Résolution", "Demandé le", "Durée", "Note",
  ];
  const rows = sessions.map((s) => [
    s.id.slice(0, 8),
    STATUS_LABELS[s.status] ?? s.status,
    s.patient_name ?? "",
    s.doctor_name ?? "",
    s.symptom_category ?? "",
    s.fee ? (s.fee / 1000).toFixed(3) : "",
    s.commission ? (s.commission / 1000).toFixed(3) : "",
    s.distance_m != null ? String(Math.round(s.distance_m)) : "",
    s.resolution ?? "",
    new Date(s.requested_at).toLocaleString("fr-TN"),
    formatDuration(s.duration_ms),
    s.review_rating?.toString() ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sos-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SosSessionsPage() {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [symptom, setSymptom] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "50");
    if (statusFilter.length > 0) p.set("status", statusFilter.join(","));
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    if (symptom) p.set("symptomCategory", symptom);
    return p.toString();
  }, [page, statusFilter, fromDate, toDate, symptom]);

  const { data, isLoading } = useSWR<ApiResponse>(
    `/api/admin/sos/sessions?${queryParams}`,
    fetcher
  );

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  // Client-side doctor name filter (applied after fetch)
  const visible = useMemo(() => {
    if (!doctorSearch.trim()) return sessions;
    const q = doctorSearch.toLowerCase();
    return sessions.filter((s) => s.doctor_name?.toLowerCase().includes(q));
  }, [sessions, doctorSearch]);

  function toggleStatus(s: string) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setPage(1);
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sessions SOS</h1>
          <p className="text-slate-500 mt-1">{total} sessions au total</p>
        </div>
        <button
          onClick={() => exportCsv(visible)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-end flex-wrap">
        {/* Status multi-select */}
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1.5">Statut</p>
          <div className="flex gap-1 flex-wrap">
            {Object.keys(STATUS_LABELS).map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter.includes(s)
                    ? STATUS_COLORS[s] + " border-current"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1.5">Du</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1.5">Au</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Symptom */}
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1.5">Symptôme</label>
          <select
            value={symptom}
            onChange={(e) => { setSymptom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="">Tous</option>
            {SYMPTOM_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Doctor search */}
        <div className="flex-1 min-w-48">
          <label className="text-xs text-slate-500 font-medium block mb-1.5">Médecin</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={doctorSearch}
              onChange={(e) => setDoctorSearch(e.target.value)}
              placeholder="Nom du médecin…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Médecin</th>
                <th className="px-4 py-3 font-semibold">Symptôme</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Honoraire</th>
                <th className="px-4 py-3 font-semibold">Distance</th>
                <th className="px-4 py-3 font-semibold">Résolution</th>
                <th className="px-4 py-3 font-semibold">Demandé le</th>
                <th className="px-4 py-3 font-semibold">Durée</th>
                <th className="px-4 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    Aucune session trouvée
                  </td>
                </tr>
              )}
              {visible.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/sos/${s.id}`}
                      className="font-mono text-xs text-teal-700 hover:underline"
                    >
                      {s.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{s.patient_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{s.doctor_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.symptom_category ? (
                      <span className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded-full">
                        {s.symptom_category}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatDT(s.fee)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">
                    {s.distance_m != null ? `${Math.round(s.distance_m)} m` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {s.resolution ? (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s.resolution}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(s.requested_at).toLocaleString("fr-TN")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDuration(s.duration_ms)}</td>
                  <td className="px-4 py-3">
                    <StarRating value={s.review_rating ?? 0} readOnly size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
            <span>Page {page} / {totalPages} — {total} sessions</span>
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
