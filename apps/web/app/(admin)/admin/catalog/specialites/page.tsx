"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Plus, X, Check, AlertTriangle } from "lucide-react";

interface Specialty {
  id: string;
  label: string;
  labelAr: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

interface ApiResponse {
  specialties: Specialty[];
}

async function fetcher(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<ApiResponse>;
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

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

// ─── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  specialty: Specialty;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ specialty, onClose, onSaved }: EditModalProps) {
  const [label, setLabel] = useState(specialty.label);
  const [labelAr, setLabelAr] = useState(specialty.labelAr ?? "");
  const [icon, setIcon] = useState(specialty.icon ?? "");
  const [isActive, setIsActive] = useState(specialty.isActive);
  const [displayOrder, setDisplayOrder] = useState(String(specialty.displayOrder));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!label.trim()) {
      setError("Le libellé est requis.");
      return;
    }
    const orderNum = parseInt(displayOrder, 10);
    if (isNaN(orderNum)) {
      setError("L'ordre d'affichage doit être un entier.");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`/api/admin/catalog/specialties/${specialty.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          labelAr: labelAr.trim() || null,
          icon: icon.trim() || null,
          isActive,
          displayOrder: orderNum,
        }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Modifier{" "}
            <span className="font-mono text-teal-600">{specialty.id}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Libellé (FR)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Libellé (AR)</label>
            <input
              type="text"
              dir="rtl"
              value={labelAr}
              onChange={(e) => setLabelAr(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Icône</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="ex. stethoscope"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Toggle checked={isActive} onChange={setIsActive} />
            <span className="text-sm font-medium text-slate-700">Spécialité active</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Modal ─────────────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function AddModal({ onClose, onSaved }: AddModalProps) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [icon, setIcon] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!id.trim()) { setError("L'identifiant est requis."); return; }
    if (!label.trim()) { setError("Le libellé est requis."); return; }
    const orderNum = parseInt(displayOrder, 10);
    if (isNaN(orderNum)) { setError("L'ordre d'affichage doit être un entier."); return; }

    setSaving(true);
    try {
      const r = await fetch("/api/admin/catalog/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id.trim(),
          label: label.trim(),
          labelAr: labelAr.trim() || null,
          icon: icon.trim() || null,
          isActive,
          displayOrder: orderNum,
        }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle spécialité</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Identifiant{" "}
              <span className="text-xs text-slate-400 font-normal">(minuscules, tirets)</span>
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="ex. neurologue"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Libellé (FR)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Libellé (AR)</label>
            <input
              type="text"
              dir="rtl"
              value={labelAr}
              onChange={(e) => setLabelAr(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Icône</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="ex. stethoscope"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ordre d'affichage
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Toggle checked={isActive} onChange={setIsActive} />
            <span className="text-sm font-medium text-slate-700">Spécialité active</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            {saving ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ────────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  specialty: Specialty;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirm({ specialty, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/catalog/specialties/${specialty.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      onDeleted();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
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
          <h2 className="text-lg font-semibold text-slate-900">Supprimer la spécialité ?</h2>
          <p className="text-sm text-slate-500">
            <span className="font-mono font-medium text-slate-700">{specialty.id}</span> —{" "}
            {specialty.label} sera définitivement supprimée.
          </p>
          {error && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSpecialitesPage() {
  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/admin/catalog/specialties",
    fetcher
  );
  const [editingItem, setEditingItem] = useState<Specialty | null>(null);
  const [deletingItem, setDeletingItem] = useState<Specialty | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const specialties = data?.specialties ?? [];

  async function handleToggleActive(specialty: Specialty) {
    await fetch(`/api/admin/catalog/specialties/${specialty.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !specialty.isActive }),
    });
    mutate();
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Admin
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Spécialités</h1>
          <p className="text-slate-500 mt-1">
            Gérer le catalogue des spécialités médicales
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle spécialité
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Ordre</th>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Libellé (FR)</th>
                <th className="px-4 py-3 font-semibold">Libellé (AR)</th>
                <th className="px-4 py-3 font-semibold">Icône</th>
                <th className="px-4 py-3 font-semibold">Actif</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && specialties.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Aucune spécialité trouvée
                  </td>
                </tr>
              )}
              {specialties.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 tabular-nums text-slate-500 text-center">
                    {s.displayOrder}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {s.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.label}</td>
                  <td className="px-4 py-3 text-slate-600" dir="rtl">
                    {s.labelAr ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.icon ? (
                      <span className="font-mono text-xs">{s.icon}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={s.isActive}
                      onChange={() => handleToggleActive(s)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingItem(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => setDeletingItem(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
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

      {editingItem && (
        <EditModal
          specialty={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => mutate()}
        />
      )}
      {deletingItem && (
        <DeleteConfirm
          specialty={deletingItem}
          onClose={() => setDeletingItem(null)}
          onDeleted={() => mutate()}
        />
      )}
      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onSaved={() => mutate()} />
      )}
    </div>
  );
}
