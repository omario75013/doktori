"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Star,
  Download,
  Plus,
} from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  apptCount: number;
  reviewCount: number;
  avgRating: number | null;
  yearsOfExperience: number | null;
  consultationFee: number | null;
  consultationMode: string;
}

export function DoctorsTable({
  doctors,
  specialties,
  cities,
}: {
  doctors: Doctor[];
  specialties: string[];
  cities: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "pending">("all");
  const [specialty, setSpecialty] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      if (status === "active" && !d.isActive) return false;
      if (status === "pending" && d.isActive) return false;
      if (specialty && d.specialty !== specialty) return false;
      if (city && d.city !== city) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
      );
    });
  }, [doctors, query, status, specialty, city]);

  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
  }

  async function bulk(action: "activate" | "deactivate" | "delete") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const label =
      action === "activate"
        ? "activer"
        : action === "deactivate"
          ? "désactiver"
          : "supprimer";
    if (!confirm(`${label} ${ids.length} médecin(s) ?`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/doctors/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      startTransition(() => router.refresh());
    } else {
      setError("Erreur lors de l'action groupée.");
    }
  }

  async function toggleActive(id: string, next: boolean) {
    setBusy(true);
    const res = await fetch(`/api/admin/doctors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setBusy(false);
    if (res.ok) startTransition(() => router.refresh());
  }

  async function deleteDoc(id: string, name: string) {
    if (!confirm(`Supprimer définitivement ${name} ?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/doctors/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) startTransition(() => router.refresh());
    else setError("Impossible de supprimer ce médecin (des rendez-vous existent peut-être).");
  }

  function exportCSV() {
    const headers = [
      "Nom",
      "Email",
      "Téléphone",
      "Spécialité",
      "Ville",
      "Mode",
      "Expérience (ans)",
      "Tarif (DT)",
      "Statut",
      "RDV",
      "Avis",
      "Note moy.",
      "Créé le",
    ];
    const rows = filtered.map((d) => [
      d.name,
      d.email,
      d.phone ?? "",
      d.specialty,
      d.city,
      d.consultationMode,
      d.yearsOfExperience ?? "",
      d.consultationFee != null ? (d.consultationFee / 1000).toFixed(1) : "",
      d.isActive ? "Actif" : "En attente",
      d.apptCount,
      d.reviewCount,
      d.avgRating != null ? d.avgRating.toFixed(1) : "",
      new Date(d.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medecins_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            placeholder="Rechercher nom, email, spécialité, ville..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Toutes spécialités</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">Toutes villes</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {(["all", "active", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                status === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "all" ? "Tous" : f === "active" ? "Actifs" : "En attente"}
            </button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          title="Exporter CSV"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
        <Link
          href="/admin/medecins/import"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          title="Importer des médecins"
        >
          <Plus className="w-4 h-4" />
          Import
        </Link>
        <Link
          href="/admin/medecins/nouveau"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau
        </Link>
      </div>

      {selected.size > 0 && (
        <div className="px-4 py-3 bg-teal-50 border-b border-teal-200 flex items-center justify-between text-sm">
          <span className="text-teal-900">
            {selected.size} médecin{selected.size > 1 ? "s" : ""} sélectionné
            {selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => bulk("activate")}
              disabled={busy || pending}
              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-200 rounded-md hover:bg-green-50 disabled:opacity-50"
            >
              Activer
            </button>
            <button
              onClick={() => bulk("deactivate")}
              disabled={busy || pending}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-200 rounded-md hover:bg-amber-50 disabled:opacity-50"
            >
              Désactiver
            </button>
            <button
              onClick={() => bulk("delete")}
              disabled={busy || pending}
              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selected.size === filtered.length
                  }
                  onChange={toggleAll}
                  aria-label="Sélectionner tout"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Médecin</th>
              <th className="px-4 py-3 font-semibold">Spécialité</th>
              <th className="px-4 py-3 font-semibold">Ville</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold">Exp.</th>
              <th className="px-4 py-3 font-semibold">Tarif</th>
              <th className="px-4 py-3 font-semibold">RDV</th>
              <th className="px-4 py-3 font-semibold">Avis</th>
              <th className="px-4 py-3 font-semibold">Créé le</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggleOne(d.id)}
                    aria-label={`Sélectionner ${d.name}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/medecins/${d.id}`}
                    className="font-medium text-slate-900 hover:text-teal-600"
                  >
                    {d.name}
                  </Link>
                  <div className="text-xs text-slate-500">{d.email}</div>
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">
                  {d.specialty}
                </td>
                <td className="px-4 py-3 capitalize text-slate-700">{d.city}</td>
                <td className="px-4 py-3 text-slate-700 capitalize text-xs">
                  {d.consultationMode}
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums text-xs">
                  {d.yearsOfExperience != null ? `${d.yearsOfExperience} ans` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums text-xs">
                  {d.consultationFee != null
                    ? `${(d.consultationFee / 1000).toFixed(0)} DT`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700 tabular-nums">
                  {d.apptCount}
                </td>
                <td className="px-4 py-3">
                  {d.reviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {d.avgRating?.toFixed(1)}
                      <span className="text-xs text-slate-400">
                        ({d.reviewCount})
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(d.id, !d.isActive)}
                    disabled={busy || pending}
                    className="disabled:opacity-50"
                    title={d.isActive ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                  >
                    {d.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full hover:bg-green-100 transition-colors">
                        <CheckCircle2 className="w-3 h-3" />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full hover:bg-amber-100 transition-colors">
                        En attente
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/medecins/${d.id}`}
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                      title="Détails"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteDoc(d.id, d.name)}
                      disabled={busy || pending}
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
                <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                  Aucun médecin trouvé
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
