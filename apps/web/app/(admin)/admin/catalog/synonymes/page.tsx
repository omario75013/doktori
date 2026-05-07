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
  Search,
  RefreshCw,
} from "lucide-react";

interface Synonym {
  id: string;
  term: string;
  synonyms: string[];
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

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

function SynonymModal({
  initial,
  isCreate,
  onClose,
  onSaved,
}: {
  initial: Synonym | null;
  isCreate: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [term, setTerm] = useState(initial?.term ?? "");
  const [list, setList] = useState((initial?.synonyms ?? []).join(", "));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!term.trim()) {
      setError("Terme requis");
      return;
    }
    const synonyms = list
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (synonyms.length === 0) {
      setError("Au moins un synonyme requis");
      return;
    }
    setSaving(true);
    try {
      const url = isCreate
        ? "/api/admin/catalog/synonymes"
        : `/api/admin/catalog/synonymes/${initial!.id}`;
      const method = isCreate ? "POST" : "PATCH";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.trim(), synonyms, isActive }),
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {isCreate ? "Nouveau synonyme" : "Modifier synonyme"}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Terme</label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ex. dentiste"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Synonymes <span className="text-xs text-slate-400">(séparés par des virgules)</span>
            </label>
            <textarea
              value={list}
              onChange={(e) => setList(e.target.value)}
              rows={3}
              placeholder="dentaire, chirurgien-dentiste, odontologue"
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
  syn,
  onClose,
  onDeleted,
}: {
  syn: Synonym;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      const r = await fetch(`/api/admin/catalog/synonymes/${syn.id}`, { method: "DELETE" });
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
          <p className="text-sm text-slate-500 font-mono">{syn.term}</p>
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

export default function AdminSynonymesPage() {
  const { data, isLoading, mutate } = useSWR<{ synonyms: Synonym[] }>(
    "/api/admin/catalog/synonymes",
    fetcher
  );
  const [editing, setEditing] = useState<Synonym | null>(null);
  const [deleting, setDeleting] = useState<Synonym | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const synonyms = data?.synonyms ?? [];

  async function handleResync() {
    setResyncing(true);
    setResyncMsg(null);
    try {
      const r = await fetch("/api/admin/catalog/synonymes/resync", { method: "POST" });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      const d = (await r.json()) as { count: number };
      setResyncMsg({ kind: "ok", text: `${d.count} synonyme(s) poussé(s) vers Meilisearch` });
    } catch (e) {
      setResyncMsg({ kind: "err", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setResyncing(false);
    }
  }

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
            <Search className="w-8 h-8 text-teal-600" />
            Synonymes Meilisearch
          </h1>
          <p className="text-slate-500 mt-1">
            Termes équivalents pour la recherche (ex. dentiste ↔ chirurgien-dentiste)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResync}
            disabled={resyncing}
            className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-700 text-sm font-medium rounded-lg hover:bg-teal-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${resyncing ? "animate-spin" : ""}`} />
            {resyncing ? "Resync…" : "Resync Meilisearch"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </button>
        </div>
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Terme</th>
                <th className="px-4 py-3 font-semibold">Synonymes</th>
                <th className="px-4 py-3 font-semibold">Actif</th>
                <th className="px-4 py-3 font-semibold">Mis à jour</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && synonyms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Aucun synonyme
                  </td>
                </tr>
              )}
              {synonyms.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 font-mono text-xs">
                    {s.term}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.synonyms.map((syn) => (
                        <span
                          key={syn}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-700"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={s.isActive}
                      onChange={async (v) => {
                        await fetch(`/api/admin/catalog/synonymes/${s.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: v }),
                        });
                        mutate();
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                    {new Date(s.updatedAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => setDeleting(s)}
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
        <SynonymModal
          initial={null}
          isCreate
          onClose={() => setShowAdd(false)}
          onSaved={() => mutate()}
        />
      )}
      {editing && (
        <SynonymModal
          initial={editing}
          isCreate={false}
          onClose={() => setEditing(null)}
          onSaved={() => mutate()}
        />
      )}
      {deleting && (
        <DeleteConfirm
          syn={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => mutate()}
        />
      )}
    </div>
  );
}
