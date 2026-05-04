"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

type ApiKeyRow = {
  id: string;
  prefix: string;
  name: string;
  ownerEmail: string | null;
  scopes: string[];
  rateLimitPerMinute: number;
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

const ALL_SCOPES = [
  { id: "read:doctors", label: "Lire médecins" },
  { id: "read:specialties", label: "Lire spécialités" },
  { id: "read:cities", label: "Lire villes" },
  { id: "read:availability", label: "Lire disponibilités" },
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function ApiKeysClient({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const router = useRouter();
  const [keys] = useState<ApiKeyRow[]>(initialKeys);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{ rawKey: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:doctors", "read:specialties", "read:cities"]);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [expiresAt, setExpiresAt] = useState("");

  function toggleScope(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ownerEmail: ownerEmail.trim() || null,
          scopes,
          rateLimitPerMinute,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création");
        return;
      }
      setCreatedKey({ rawKey: data.rawKey, name: data.key.name });
      setShowForm(false);
      setName("");
      setOwnerEmail("");
      setRateLimitPerMinute(60);
      setExpiresAt("");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(id: string, keyName: string) {
    if (!confirm(`Révoquer la clé « ${keyName} » ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Erreur lors de la révocation");
    }
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {createdKey && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900">
                Clé créée : « {createdKey.name} »
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Copiez cette clé maintenant. Elle ne sera plus jamais affichée.
              </p>
              <div className="mt-3 flex items-center gap-2 bg-white border border-amber-300 rounded-lg p-3">
                <code className="flex-1 text-sm font-mono text-slate-900 break-all">
                  {createdKey.rawKey}
                </code>
                <button
                  type="button"
                  onClick={copyKey}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCreatedKey(null)}
                className="mt-3 text-xs text-amber-800 hover:text-amber-900 underline"
              >
                J&apos;ai sauvegardé la clé, fermer ce message
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle clé
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-900">Créer une clé API</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                placeholder="Ex: Partenaire intégration X"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email du propriétaire</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="contact@partenaire.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Limite (req / min)</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={rateLimitPerMinute}
                onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration (optionnel)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Scopes *</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    scopes.includes(s.id)
                      ? "bg-teal-50 border-teal-500 text-teal-800"
                      : "bg-white border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.id)}
                    onChange={() => toggleScope(s.id)}
                    className="w-3.5 h-3.5"
                  />
                  <code className="text-xs">{s.id}</code>
                  <span className="text-xs">— {s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || scopes.length === 0}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
              {submitting ? "Création…" : "Créer la clé"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {keys.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg">Aucune clé API.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Préfixe
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                  Scopes
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Limite
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                  Dernière utilisation
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((k) => {
                const expired = k.expiresAt && new Date(k.expiresAt).getTime() < Date.now();
                const isActive = k.active && !k.revokedAt && !expired;
                return (
                  <tr key={k.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{k.name}</p>
                      {k.ownerEmail && (
                        <p className="text-xs text-slate-400">{k.ownerEmail}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                        {k.prefix}…
                      </code>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <code
                            key={s}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded"
                          >
                            {s}
                          </code>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-slate-700">{k.rateLimitPerMinute}/min</span>
                    </td>
                    <td className="px-4 py-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          Actif
                        </span>
                      ) : k.revokedAt ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          Révoquée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                          Expirée
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(k.lastUsedAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => revoke(k.id, k.name)}
                          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
