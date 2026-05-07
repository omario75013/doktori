"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  X,
  Check,
  AlertTriangle,
  ListTodo,
} from "lucide-react";

interface Motif {
  id: string;
  name: string;
  nameAr: string | null;
  specialtyId: string | null;
  specialtyLabel: string | null;
  durationMinutes: number;
  suggestedFee: number | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}
interface Specialty {
  id: string;
  label: string;
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "consultation", label: "Consultation" },
  { value: "controle", label: "Contrôle" },
  { value: "urgence", label: "Urgence" },
  { value: "teleconsultation", label: "Téléconsultation" },
  { value: "domicile", label: "Domicile" },
  { value: "autre", label: "Autre" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
        checked ? "bg-teal-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? "left-5" : "left-1"
        }`}
      />
    </button>
  );
}

function MotifModal({
  initial,
  isCreate,
  specialties,
  onClose,
  onSaved,
}: {
  initial: Motif | null;
  isCreate: boolean;
  specialties: Specialty[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [specialtyId, setSpecialtyId] = useState(initial?.specialtyId ?? "");
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 30));
  const [fee, setFee] = useState(initial?.suggestedFee != null ? String(initial.suggestedFee) : "");
  const [category, setCategory] = useState(initial?.category ?? "consultation");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Nom requis");
      return;
    }
    const dur = parseInt(duration, 10);
    if (Number.isNaN(dur) || dur < 5 || dur > 480) {
      setError("Durée invalide (5-480 min)");
      return;
    }
    const order = parseInt(sortOrder, 10);
    if (Number.isNaN(order)) {
      setError("Ordre invalide");
      return;
    }
    let feeNum: number | null = null;
    if (fee.trim() !== "") {
      const f = parseInt(fee, 10);
      if (Number.isNaN(f) || f < 0) {
        setError("Tarif invalide");
        return;
      }
      feeNum = f;
    }
    setSaving(true);
    try {
      const url = isCreate
        ? "/api/admin/catalog/motifs"
        : `/api/admin/catalog/motifs/${initial!.id}`;
      const method = isCreate ? "POST" : "PATCH";
      const body = {
        name: name.trim(),
        nameAr: nameAr.trim() || null,
        specialtyId: specialtyId.trim() || null,
        durationMinutes: dur,
        suggestedFee: feeNum,
        category,
        isActive,
        sortOrder: order,
      };
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: unknown };
        const msg = typeof d.error === "string" ? d.error : `HTTP ${r.status}`;
        throw new Error(msg);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {isCreate ? "Nouveau motif" : "Modifier motif"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom (FR)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Consultation de suivi"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom (AR)</label>
            <input
              type="text"
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Spécialité (optionnel)
            </label>
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">— Toutes spécialités —</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Durée (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarif (TND)</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="optionnel"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ordre</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Toggle checked={isActive} onChange={setIsActive} />
            <span className="text-sm font-medium text-slate-700">Actif</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({
  motif,
  onClose,
  onDeleted,
}: {
  motif: Motif;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/catalog/motifs/${motif.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      onDeleted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Supprimer le motif ?</h2>
          <p className="text-sm text-slate-500">{motif.name}</p>
          {error && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMotifsPage() {
  const motifsSwr = useSWR<{ motifs: Motif[] }>("/api/admin/catalog/motifs", fetcher);
  const specSwr = useSWR<{ specialties: Specialty[] }>(
    "/api/admin/catalog/specialties",
    fetcher
  );
  const [editing, setEditing] = useState<Motif | null>(null);
  const [deleting, setDeleting] = useState<Motif | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const motifs = motifsSwr.data?.motifs ?? [];
  const specialties = specSwr.data?.specialties ?? [];

  return (
    <div className="p-8 max-w-[1300px] mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Admin
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-teal-600" />
            Motifs (catalogue global)
          </h1>
          <p className="text-slate-500 mt-1">
            Modèles de motifs importables par les médecins
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau motif
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Ordre</th>
                <th className="px-4 py-3 font-semibold">Nom (FR)</th>
                <th className="px-4 py-3 font-semibold">Spécialité</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Durée</th>
                <th className="px-4 py-3 font-semibold">Tarif</th>
                <th className="px-4 py-3 font-semibold">Actif</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {motifsSwr.isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}
              {!motifsSwr.isLoading && motifs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Aucun motif
                  </td>
                </tr>
              )}
              {motifs.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 tabular-nums text-slate-500 text-center">
                    {m.sortOrder}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.specialtyLabel ?? <span className="text-slate-300">— toutes —</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                      {m.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{m.durationMinutes} min</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">
                    {m.suggestedFee != null ? `${m.suggestedFee} TND` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={m.isActive}
                      onChange={async (v) => {
                        await fetch(`/api/admin/catalog/motifs/${m.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: v }),
                        });
                        motifsSwr.mutate();
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => setDeleting(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <MotifModal
          initial={null}
          isCreate
          specialties={specialties}
          onClose={() => setShowAdd(false)}
          onSaved={() => motifsSwr.mutate()}
        />
      )}
      {editing && (
        <MotifModal
          initial={editing}
          isCreate={false}
          specialties={specialties}
          onClose={() => setEditing(null)}
          onSaved={() => motifsSwr.mutate()}
        />
      )}
      {deleting && (
        <DeleteConfirm
          motif={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => motifsSwr.mutate()}
        />
      )}
    </div>
  );
}
