"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ExternalLink, Ban, CheckCircle2 } from "lucide-react";

export interface PatientRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  noShowCount: number;
  lastMinuteCancelCount: number;
  isSuspended: boolean;
  createdAt: string;
  apptCount: number;
  reviewCount: number;
}

export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suspendedFilter, setSuspendedFilter] = useState<"all" | "suspended" | "active">("all");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (suspendedFilter === "suspended" && !p.isSuspended) return false;
      if (suspendedFilter === "active" && p.isSuspended) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [patients, query, suspendedFilter]);

  async function unban(id: string) {
    if (!confirm("Réactiver ce patient ?")) return;
    setError(null);
    const res = await fetch(`/api/admin/patients/${id}/unban`, { method: "POST" });
    if (res.ok) startTransition(() => router.refresh());
    else setError("Erreur lors de la réactivation du patient.");
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-700 transition-colors">✕</button>
        </div>
      )}
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher nom, téléphone, email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {(["all", "active", "suspended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSuspendedFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                suspendedFilter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "all" ? "Tous" : f === "active" ? "Actifs" : "Suspendus"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Téléphone</th>
              <th className="px-4 py-3 font-semibold">RDV</th>
              <th className="px-4 py-3 font-semibold">No-shows</th>
              <th className="px-4 py-3 font-semibold">Annulations</th>
              <th className="px-4 py-3 font-semibold">Avis</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Inscrit le</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/patients/${p.id}`}
                    className="font-medium text-slate-900 hover:text-teal-600"
                  >
                    {p.name}
                  </Link>
                  {p.email && (
                    <div className="text-xs text-slate-500">{p.email}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums">{p.phone}</td>
                <td className="px-4 py-3 text-slate-700 tabular-nums">{p.apptCount}</td>
                <td className="px-4 py-3 tabular-nums">
                  {p.noShowCount > 0 ? (
                    <span className="text-red-600 font-medium">{p.noShowCount}</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {p.lastMinuteCancelCount > 0 ? (
                    <span className="text-amber-600 font-medium">{p.lastMinuteCancelCount}</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums">{p.reviewCount}</td>
                <td className="px-4 py-3">
                  {p.isSuspended ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                      <Ban className="w-3 h-3" />
                      Suspendu
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Actif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/patients/${p.id}`}
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                      title="Détails"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    {p.isSuspended && (
                      <button
                        onClick={() => unban(p.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="Réactiver"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  Aucun patient trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
