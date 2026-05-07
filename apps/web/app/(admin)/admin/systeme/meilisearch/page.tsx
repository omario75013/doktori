"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Search, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface IndexInfo {
  uid: string;
  primaryKey: string | null;
  numberOfDocuments: number | null;
  isIndexing: boolean | null;
  fieldDistribution: Record<string, number> | null;
  settings: {
    searchableAttributes: string[] | null;
    filterableAttributes: string[] | null;
    sortableAttributes: string[] | null;
    synonymsCount: number;
    stopWordsCount: number;
  } | null;
}

interface ApiResponse {
  version: string | null;
  health: { status: string } | null;
  indexes: IndexInfo[];
  error?: string;
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  return r.json() as Promise<ApiResponse>;
};

export default function AdminMeilisearchPage() {
  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/admin/system/meilisearch",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const [resyncing, setResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleResync() {
    setResyncing(true);
    setResyncMsg(null);
    try {
      const r = await fetch("/api/admin/system/meilisearch/resync", { method: "POST" });
      const d = (await r.json()) as { ok: boolean; result: unknown; error?: string };
      if (!r.ok || !d.ok) {
        setResyncMsg({
          kind: "err",
          text: d.error ?? `Resync échoué (${r.status})`,
        });
      } else {
        setResyncMsg({ kind: "ok", text: "Re-indexation déclenchée" });
        mutate();
      }
    } catch (e) {
      setResyncMsg({ kind: "err", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setResyncing(false);
    }
  }

  const healthOk = data?.health?.status === "available";
  const indexes = data?.indexes ?? [];

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <Link
        href="/admin/systeme"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Système
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Search className="w-8 h-8 text-teal-600" />
            Meilisearch
          </h1>
          <p className="text-slate-500 mt-1">Index, statistiques, paramètres</p>
        </div>
        <button
          onClick={handleResync}
          disabled={resyncing}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {resyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {resyncing ? "Resync…" : "Re-indexer"}
        </button>
      </div>

      {resyncMsg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            resyncMsg.kind === "ok"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {resyncMsg.text}
        </div>
      )}

      {/* Health + version */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Santé</div>
          {data?.error ? (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="w-5 h-5" />
              {data.error}
            </div>
          ) : healthOk ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Disponible
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Vérification…
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Version</div>
          <div className="font-mono text-sm text-slate-900">{data?.version ?? "—"}</div>
        </div>
      </div>

      {/* Indexes */}
      <div className="space-y-4">
        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Chargement…
          </div>
        )}
        {!isLoading && indexes.length === 0 && !data?.error && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Aucun index
          </div>
        )}
        {indexes.map((idx) => (
          <div key={idx.uid} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="font-semibold text-slate-900 font-mono">{idx.uid}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Primary key: <span className="font-mono">{idx.primaryKey ?? "—"}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-teal-700 tabular-nums">
                  {idx.numberOfDocuments?.toLocaleString("fr-FR") ?? "—"}
                </div>
                <div className="text-xs text-slate-500">documents</div>
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">État</div>
                {idx.isIndexing ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Indexation
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-50 text-green-700">
                    Idle
                  </span>
                )}
              </div>
              {idx.settings && (
                <>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Synonymes / Stopwords</div>
                    <div className="text-slate-700 tabular-nums">
                      {idx.settings.synonymsCount} / {idx.settings.stopWordsCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Searchable</div>
                    <div className="text-slate-700 text-xs font-mono">
                      {idx.settings.searchableAttributes?.slice(0, 8).join(", ") ?? "—"}
                      {(idx.settings.searchableAttributes?.length ?? 0) > 8 && " …"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Filterable</div>
                    <div className="text-slate-700 text-xs font-mono">
                      {idx.settings.filterableAttributes?.slice(0, 8).join(", ") ?? "—"}
                      {(idx.settings.filterableAttributes?.length ?? 0) > 8 && " …"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
