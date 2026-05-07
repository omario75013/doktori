"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Plus, X, Check, AlertTriangle, Shield } from "lucide-react";

interface Provider {
  id: string;
  label: string;
  labelAr: string | null;
  type: "public" | "private";
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  providers: Provider[];
}

async function fetcher(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<ApiResponse>;
}

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

interface FormFields {
  id: string;
  label: string;
  labelAr: string;
  type: "public" | "private";
  isActive: boolean;
  sortOrder: string;
}

function ProviderModal({
  initial,
  isCreate,
  onClose,
  onSaved,
}: {
  initial: Provider | null;
  isCreate: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormFields>({
    id: initial?.id ?? "",
    label: initial?.label ?? "",
    labelAr: initial?.labelAr ?? "",
    type: initial?.type ?? "public",
    isActive: initial?.isActive ?? true,
    sortOrder: String(initial?.sortOrder ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (isCreate && !/^[a-z0-9_-]{1,50}$/.test(f.id)) {
      setError("Identifiant invalide (a-z, 0-9, _ -)");
      return;
    }
    if (!f.label.trim()) {
      setError("Libellé requis");
      return;
    }
    const order = parseInt(f.sortOrder, 10);
    if (Number.isNaN(order)) {
      setError("Ordre invalide");
      return;
    }

    setSaving(true);
    try {
      const url = isCreate
        ? "/api/admin/catalog/insurance"
        : `/api/admin/catalog/insurance/${initial!.id}`;
      const method = isCreate ? "POST" : "PATCH";
      const body: Record<string, unknown> = {
        label: f.label.trim(),
        labelAr: f.labelAr.trim() || null,
        type: f.type,
        isActive: f.isActive,
        sortOrder: order,
      };
      if (isCreate) body.id = f.id.trim();
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: unknown };
        const msg =
          typeof d.error === "string" ? d.error : `HTTP ${r.status}`;
        throw new Error(msg);
      }
      onSaved();
      onClose();
    } catch (e) {
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
            {isCreate ? "Nouvel organisme" : `Modifier ${initial?.label}`}
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
          {isCreate && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Identifiant <span className="text-xs text-slate-400">(minuscules)</span>
              </label>
              <input
                type="text"
                value={f.id}
                onChange={(e) =>
                  setF({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })
                }
                placeholder="ex. cnam"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Libellé (FR)</label>
            <input
              type="text"
              value={f.label}
              onChange={(e) => setF({ ...f, label: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Libellé (AR)</label>
            <input
              type="text"
              dir="rtl"
              value={f.labelAr}
              onChange={(e) => setF({ ...f, labelAr: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value as "public" | "private" })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ordre</label>
            <input
              type="number"
              value={f.sortOrder}
              onChange={(e) => setF({ ...f, sortOrder: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Toggle checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
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
  provider,
  onClose,
  onDeleted,
}: {
  provider: Provider;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/catalog/insurance/${provider.id}`, { method: "DELETE" });
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
          <h2 className="text-lg font-semibold text-slate-900">Supprimer ?</h2>
          <p className="text-sm text-slate-500">
            <span className="font-mono font-medium text-slate-700">{provider.id}</span> —{" "}
            {provider.label}
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

export default function AdminAssurancesPage() {
  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/admin/catalog/insurance",
    fetcher
  );
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const providers = data?.providers ?? [];

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
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
            <Shield className="w-8 h-8 text-teal-600" />
            Assurances
          </h1>
          <p className="text-slate-500 mt-1">
            Organismes d'assurance maladie (CNAM, CNRPS, mutuelles privées)
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau
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
                <th className="px-4 py-3 font-semibold">Type</th>
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
              {!isLoading && providers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Aucun organisme
                  </td>
                </tr>
              )}
              {providers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 tabular-nums text-slate-500 text-center">
                    {p.sortOrder}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {p.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.label}</td>
                  <td className="px-4 py-3 text-slate-600" dir="rtl">
                    {p.labelAr ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        p.type === "public"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.type === "public" ? "Public" : "Privé"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={p.isActive}
                      onChange={async (v) => {
                        await fetch(`/api/admin/catalog/insurance/${p.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: v }),
                        });
                        mutate();
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => setDeleting(p)}
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
        <ProviderModal
          initial={null}
          isCreate
          onClose={() => setShowAdd(false)}
          onSaved={() => mutate()}
        />
      )}
      {editing && (
        <ProviderModal
          initial={editing}
          isCreate={false}
          onClose={() => setEditing(null)}
          onSaved={() => mutate()}
        />
      )}
      {deleting && (
        <DeleteConfirm
          provider={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => mutate()}
        />
      )}
    </div>
  );
}
