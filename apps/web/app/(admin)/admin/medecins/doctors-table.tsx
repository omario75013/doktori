"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CheckCircle2, XCircle, Trash2, ExternalLink } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string;
  city: string;
  isActive: boolean;
  createdAt: string;
}

export function DoctorsTable({ doctors }: { doctors: Doctor[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "pending">("all");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      if (filter === "active" && !d.isActive) return false;
      if (filter === "pending" && d.isActive) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
      );
    });
  }, [doctors, query, filter]);

  async function toggleActive(id: string, next: boolean) {
    setBusyId(id);
    const res = await fetch(`/api/admin/doctors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setBusyId(null);
    if (res.ok) startTransition(() => router.refresh());
  }

  async function deleteDoc(id: string, name: string) {
    if (!confirm(`Supprimer définitivement ${name} ?`)) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/doctors/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) startTransition(() => router.refresh());
    else alert("Impossible de supprimer (rendez-vous existants ?)");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher nom, email, spécialité, ville..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {(["all", "active", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "all" ? "Tous" : f === "active" ? "Actifs" : "En attente"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Médecin</th>
              <th className="px-4 py-3 font-semibold">Spécialité</th>
              <th className="px-4 py-3 font-semibold">Ville</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Inscrit</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{d.name}</div>
                  <div className="text-xs text-slate-500">{d.email}</div>
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">{d.specialty}</td>
                <td className="px-4 py-3 capitalize text-slate-700">{d.city}</td>
                <td className="px-4 py-3">
                  {d.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                      En attente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/medecin/${d.email.split("@")[0]}`}
                      target="_blank"
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                      title="Voir profil public"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => toggleActive(d.id, !d.isActive)}
                      disabled={busyId === d.id || pending}
                      className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                        d.isActive
                          ? "text-amber-600 hover:bg-amber-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      title={d.isActive ? "Désactiver" : "Activer"}
                    >
                      {d.isActive ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteDoc(d.id, d.name)}
                      disabled={busyId === d.id || pending}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Aucun médecin trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
