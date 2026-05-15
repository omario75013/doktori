"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, ExternalLink, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

type ResultRow = {
  id: string;
  internalRef: string | null;
  status: string;
  tests: Array<{ code?: string; label?: string }>;
  urgency: string;
  resultUploadedAt: string | null;
  patientName: string;
  doctorName: string | null;
  technicianName: string | null;
  fileUrl: string | null;
};

const STATUS_PILL: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  collected: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
};

export default function LaboratoireResultatsPage() {
  const t = useTranslations("laboratoire.results");

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const res = await fetch(`/api/laboratoire/results?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [status, q, from, to, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  function examLabel(tests: ResultRow["tests"]) {
    if (!tests.length) return "—";
    return tests.map((t) => t.label ?? t.code ?? "").filter(Boolean).join(", ");
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
        <FileText className="h-6 w-6 text-green-600" strokeWidth={2.5} />
        {t("title")}
      </h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <select
          className="border border-border rounded-xl px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Tous statuts</option>
          <option value="completed">Complété</option>
          <option value="result_ready">Résultat prêt</option>
        </select>
        <input
          className="border border-border rounded-xl px-3 py-2 text-sm w-48"
          placeholder={t("search")}
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <input
          type="date"
          className="border border-border rounded-xl px-3 py-2 text-sm"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
        />
        <input
          type="date"
          className="border border-border rounded-xl px-3 py-2 text-sm"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("columns.date")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("patient")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("doctor")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("exams")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("technician")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("ref")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">{t("status")}</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {row.resultUploadedAt ? new Date(row.resultUploadedAt).toLocaleDateString("fr-TN") : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.patientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.doctorName ? `Dr ${row.doctorName}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px] truncate">{examLabel(row.tests)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.technicianName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.internalRef ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_PILL[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.fileUrl && (
                          <a
                            href={row.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-gray-100"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("view")}
                          </a>
                        )}
                        <a
                          href={`/laboratoire/commandes/${row.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-gray-100"
                        >
                          <Share2 className="h-3 w-3" />
                          {t("share")}
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
