"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ToggleLeft, ToggleRight, Clock, Copy, Check } from "lucide-react";

const AVAILABLE_EVENTS = [
  "booking.created",
  "booking.cancelled",
  "doctor.registered",
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  secret: string;
}

interface Props {
  initialWebhooks: Webhook[];
}

export function WebhooksManager({ initialWebhooks }: Props) {
  const router = useRouter();
  const [hooks, setHooks] = useState<Webhook[]>(initialWebhooks);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function copySecret(id: string, secret: string) {
    navigator.clipboard.writeText(secret).catch(console.error);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function toggleActive(hook: Webhook) {
    setBusy(true);
    const res = await fetch(`/api/admin/webhooks/${hook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !hook.isActive }),
    });
    setBusy(false);
    if (res.ok) {
      setHooks((prev) =>
        prev.map((h) => (h.id === hook.id ? { ...h, isActive: !h.isActive } : h))
      );
    } else {
      setError("Impossible de modifier ce webhook.");
    }
  }

  async function deleteHook(id: string) {
    if (!confirm("Supprimer ce webhook ?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setHooks((prev) => prev.filter((h) => h.id !== id));
      refresh();
    } else {
      setError("Impossible de supprimer ce webhook.");
    }
  }

  async function createHook() {
    if (!formUrl || formEvents.length === 0) {
      setError("URL et au moins un événement requis.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: formUrl, events: formEvents }),
    });
    setBusy(false);
    if (res.ok) {
      const { webhook } = await res.json();
      setHooks((prev) => [
        {
          ...webhook,
          createdAt: webhook.createdAt,
          lastTriggeredAt: webhook.lastTriggeredAt ?? null,
          events: webhook.events as string[],
        },
        ...prev,
      ]);
      setShowForm(false);
      setFormUrl("");
      setFormEvents([]);
      refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de la création.");
    }
  }

  function toggleEvent(ev: string) {
    setFormEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau webhook
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Nouveau webhook</h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">URL de destination</label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://exemple.com/webhook"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Événements</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="accent-teal-600"
                  />
                  <span className="text-xs font-mono text-slate-700">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              onClick={createHook}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
            >
              Créer
            </button>
          </div>
        </div>
      )}

      {hooks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm">
          Aucun webhook configuré.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {hooks.map((hook) => (
            <div key={hook.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      hook.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {hook.isActive ? "Actif" : "Inactif"}
                  </span>
                  <span className="text-sm font-mono text-slate-700 truncate">{hook.url}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(hook.events as string[]).map((ev) => (
                    <span
                      key={ev}
                      className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-600 rounded"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
                {hook.lastTriggeredAt && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    Dernier appel : {new Date(hook.lastTriggeredAt).toLocaleString("fr-FR")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copySecret(hook.id, hook.secret)}
                  title="Copier le secret HMAC"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {copiedId === hook.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => toggleActive(hook)}
                  disabled={busy}
                  title={hook.isActive ? "Désactiver" : "Activer"}
                  className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {hook.isActive ? (
                    <ToggleRight className="w-5 h-5 text-teal-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => deleteHook(hook.id)}
                  disabled={busy}
                  title="Supprimer"
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
