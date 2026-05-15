"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, User, ClipboardList, FileText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type PatientHit = { id: string; name: string; phone: string; cin: string | null };
type OrderHit = { id: string; status: string; patient_name: string; created_at: string; internal_ref: string | null };
type DocHit = { id: string; title: string | null; file_name: string; patient_name: string; created_at: string };

type Results = {
  patients: PatientHit[];
  orders: OrderHit[];
  documents: DocHit[];
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    collected: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    pending: "En attente",
    collected: "Prélevé",
    completed: "Complété",
    cancelled: "Annulé",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function RechercheContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/laboratoire/search?q=${encodeURIComponent(query)}&limit=50`);
      if (res.ok) setResults(await res.json() as Results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(q);
  }

  const total = results
    ? results.patients.length + results.orders.length + results.documents.length
    : 0;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 flex h-12 items-center rounded-2xl border-2 border-border px-4 focus-within:border-green-500 bg-white">
          <Search className="mr-2 h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2} />
          <input
            autoFocus
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom patient, CIN, téléphone, réf interne…"
            className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="h-12 px-5 rounded-2xl bg-green-600 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
        </button>
      </form>

      {results && (
        <p className="text-sm text-muted-foreground">{total} résultat{total !== 1 ? "s" : ""}</p>
      )}

      {results && (
        <div className="space-y-6">
          {results.patients.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-green-800 mb-3 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Patients ({results.patients.length})
              </h2>
              <div className="space-y-2">
                {results.patients.map((p) => (
                  <Link
                    key={p.id}
                    href={`/laboratoire/patients/${p.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 hover:border-green-400 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-green-700" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{p.phone}{p.cin ? ` · CIN: ${p.cin}` : ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.orders.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-green-800 mb-3 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Commandes ({results.orders.length})
              </h2>
              <div className="space-y-2">
                {results.orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/laboratoire/commandes/${o.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 hover:border-green-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{o.patient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("fr-TN")}
                        {o.internal_ref ? ` · Réf: ${o.internal_ref}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.documents.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-green-800 mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Documents ({results.documents.length})
              </h2>
              <div className="space-y-2">
                {results.documents.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3"
                  >
                    <FileText className="h-4 w-4 text-green-700 shrink-0" strokeWidth={2.5} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.title ?? d.file_name}</p>
                      <p className="text-xs text-muted-foreground">{d.patient_name} · {new Date(d.created_at).toLocaleDateString("fr-TN")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun résultat pour &laquo; {q} &raquo;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
