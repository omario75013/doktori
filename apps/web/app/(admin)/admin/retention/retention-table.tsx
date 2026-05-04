"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Policy {
  resourceType: string;
  retentionDays: number;
  description: string | null;
  hardDelete: boolean;
  lastRunAt: string | null;
  updatedAt: string;
}

const RESOURCE_LABELS: Record<string, string> = {
  audit_logs: "Logs d'audit administrateur",
  sms_logs: "Logs SMS / email",
  messages: "Messagerie patient ↔ médecin",
  cancelled_appointments: "Rendez-vous annulés",
  inactive_patients: "Patients inactifs",
  webhook_logs: "Logs de webhooks",
  analytics_events: "Événements analytics",
};

export function RetentionTable({ policies }: { policies: Policy[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftDays, setDraftDays] = useState<number>(0);
  const [draftHardDelete, setDraftHardDelete] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function startEdit(p: Policy) {
    setEditing(p.resourceType);
    setDraftDays(p.retentionDays);
    setDraftHardDelete(p.hardDelete);
    setDraftDescription(p.description ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setError(null);
  }

  async function save(resourceType: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/retention/${resourceType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: draftDays,
          hardDelete: draftHardDelete,
          description: draftDescription || null,
        }),
      });
      if (res.ok) {
        setEditing(null);
        startTransition(() => router.refresh());
      } else {
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Erreur lors de la mise à jour");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">
          Politiques actuelles ({policies.length})
        </h2>
      </div>

      {error && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3">Ressource</th>
              <th className="text-left px-5 py-3">Conservation</th>
              <th className="text-left px-5 py-3">Action</th>
              <th className="text-left px-5 py-3">Description</th>
              <th className="text-left px-5 py-3">Dernier passage</th>
              <th className="text-right px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => {
              const isEditing = editing === p.resourceType;
              return (
                <tr
                  key={p.resourceType}
                  className="border-t border-slate-100 hover:bg-slate-50 align-top"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">
                      {RESOURCE_LABELS[p.resourceType] ?? p.resourceType}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {p.resourceType}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        max={365 * 50}
                        value={draftDays}
                        onChange={(e) => setDraftDays(Number(e.target.value))}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="font-mono text-slate-700">
                        {p.retentionDays} j
                      </span>
                    )}
                    <div className="text-xs text-slate-400 mt-1">
                      ≈ {(p.retentionDays / 365).toFixed(1)} an(s)
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={draftHardDelete}
                          onChange={(e) => setDraftHardDelete(e.target.checked)}
                        />
                        Hard delete
                      </label>
                    ) : (
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.hardDelete
                            ? "bg-red-50 text-red-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {p.hardDelete ? "Suppression" : "Anonymisation"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600 max-w-md">
                    {isEditing ? (
                      <textarea
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-xs">{p.description ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {p.lastRunAt
                      ? format(new Date(p.lastRunAt), "d MMM yyyy HH:mm", {
                          locale: fr,
                        })
                      : "Jamais"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {isEditing ? (
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => save(p.resourceType)}
                          disabled={busy}
                          className="px-2 py-1 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-2 py-1 rounded-md bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                      >
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
