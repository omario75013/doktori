"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, X, ExternalLink } from "lucide-react";

interface Intent {
  id: string;
  reference: string;
  amount: number;
  status: string;
  proofFileUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  appointmentId: string | null;
  doctorName: string | null;
  patientName: string | null;
}

type StatusFilter = "pending" | "confirmed" | "rejected";

export default function BankTransfersAdminPage() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/payments/bank-transfer?status=${statusFilter}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        setIntents(data.intents);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e.message ?? e));
        setLoading(false);
      });
  }, [statusFilter]);

  async function act(intentId: string, action: "confirm" | "reject") {
    setActing(intentId);
    setError(null);
    try {
      let body: Record<string, unknown>;
      if (action === "reject") {
        const reason = prompt("Raison du rejet (3-500 caractères) :");
        if (!reason || reason.length < 3) {
          setActing(null);
          return;
        }
        body = { action, reason };
      } else {
        body = { action };
      }
      const res = await fetch(`/api/admin/payments/bank-transfer/${intentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : `HTTP ${res.status}`);
      }
      // Optimistic remove from current list view
      setIntents((prev) => prev.filter((i) => i.id !== intentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Virements bancaires</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmés</option>
          <option value="rejected">Rejetés</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : intents.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun virement {statusFilter === "pending" ? "en attente" : statusFilter}.
        </p>
      ) : (
        <div className="space-y-2">
          {intents.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Référence</p>
                  <p className="font-mono font-semibold">{i.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Montant</p>
                  <p className="font-semibold">{(i.amount / 1000).toFixed(3)} TND</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Patient → Médecin</p>
                  <p>
                    {i.patientName ?? "?"} → Dr {i.doctorName ?? "?"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Créé / Expire</p>
                  <p className="text-xs">
                    {new Date(i.createdAt).toLocaleString("fr")}
                    <br />
                    {i.expiresAt ? `→ ${new Date(i.expiresAt).toLocaleDateString("fr")}` : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {i.proofFileUrl ? (
                  <a
                    href={i.proofFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    <ExternalLink className="h-3 w-3" /> Voir preuve
                  </a>
                ) : (
                  <span className="text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                    ⚠ Pas de preuve uploadée
                  </span>
                )}

                {statusFilter === "pending" && (
                  <>
                    <button
                      onClick={() => act(i.id, "confirm")}
                      disabled={acting === i.id || !i.proofFileUrl}
                      className="inline-flex items-center gap-1 rounded-xl bg-green-600 text-white px-3 py-1.5 text-xs hover:bg-green-700 disabled:opacity-50"
                      title={
                        !i.proofFileUrl
                          ? "Une preuve doit être uploadée avant validation"
                          : ""
                      }
                    >
                      <Check className="h-3 w-3" /> Confirmer
                    </button>
                    <button
                      onClick={() => act(i.id, "reject")}
                      disabled={acting === i.id}
                      className="inline-flex items-center gap-1 rounded-xl bg-red-600 text-white px-3 py-1.5 text-xs hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Rejeter
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
