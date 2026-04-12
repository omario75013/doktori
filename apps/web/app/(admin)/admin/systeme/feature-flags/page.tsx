"use client";

import useSWR from "swr";
import { useState } from "react";
import { Flag, Plus, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  loading,
  onChange,
}: {
  enabled: boolean;
  loading: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
        enabled ? "bg-teal-600" : "bg-slate-200"
      } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      aria-checked={enabled}
      role="switch"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── New Flag Form ─────────────────────────────────────────────────────────────

function NewFlagForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, description, enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création");
        return;
      }
      onCreated();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
    >
      <h2 className="text-base font-semibold text-slate-900">Nouveau flag</h2>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Clé <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            pattern="^[a-z0-9_]{1,100}$"
            title="Minuscules, chiffres et underscores uniquement"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ex: new_feature"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brève description de la fonctionnalité"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ToggleSwitch enabled={enabled} loading={false} onChange={setEnabled} />
        <span className="text-sm text-slate-600">
          {enabled ? "Activé" : "Désactivé"} par défaut
        </span>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Créer le flag
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeatureFlagsPage() {
  const { data, isLoading, mutate } = useSWR<{ flags: FeatureFlag[] }>(
    "/api/admin/system/flags",
    fetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  async function handleToggle(flag: FeatureFlag) {
    setTogglingKey(flag.key);
    try {
      const res = await fetch(`/api/admin/system/flags/${flag.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      if (res.ok) {
        await mutate();
      }
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Feature flags</h1>
          <p className="text-slate-500 mt-1">
            Activez ou désactivez des fonctionnalités sans redéployer
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau flag
          </button>
        )}
      </div>

      {/* New flag form */}
      {showForm && (
        <NewFlagForm
          onCreated={() => {
            setShowForm(false);
            mutate();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Flags table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-3 font-medium">Clé</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-center">Activé</th>
                <th className="px-6 py-3 font-medium">Modifié le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.flags ?? []).map((flag) => (
                <tr key={flag.key} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-slate-400 shrink-0" />
                      <code className="font-mono font-medium text-slate-800">
                        {flag.key}
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 max-w-sm">
                    {flag.description ?? <span className="text-slate-300 italic">—</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ToggleSwitch
                      enabled={flag.enabled}
                      loading={togglingKey === flag.key}
                      onChange={() => handleToggle(flag)}
                    />
                  </td>
                  <td className="px-6 py-4 text-slate-400 tabular-nums text-xs">
                    {formatDate(flag.updatedAt)}
                  </td>
                </tr>
              ))}
              {(data?.flags ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Aucun flag configuré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
