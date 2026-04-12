"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { Clock, CheckCircle, XCircle, Zap, AlertTriangle, RefreshCw } from "lucide-react";

interface SosSession {
  id: string;
  status: string;
  symptom_category: string | null;
  patient_name: string | null;
  patient_lat: number;
  patient_lng: number;
  doctor_name: string | null;
  doctor_city: string | null;
  requested_at: string;
  accepted_at: string | null;
  expires_at: string;
}

interface ApiResponse {
  sessions: SosSession[];
  total: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  completed: "Terminée",
  expired: "Expirée",
  cancelled: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-red-100 text-red-700",
  accepted: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  expired: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-600",
};

function elapsed(requestedAt: string): string {
  const ms = Date.now() - new Date(requestedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}min`;
}

function timeLeft(expiresAt: string): { label: string; urgent: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return { label: "Expiré", urgent: true };
  const mins = Math.floor(ms / 60000);
  return { label: `${mins} min restantes`, urgent: mins < 5 };
}

export function SosDashboard() {
  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/admin/sos/sessions?status=pending,accepted&limit=100",
    fetcher,
    { refreshInterval: 10000 }
  );
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const sessions = data?.sessions ?? [];
  const pending = sessions.filter((s) => s.status === "pending");
  const accepted = sessions.filter((s) => s.status === "accepted");

  async function doAction(sessionId: string, action: "extend" | "cancel", reason?: string) {
    setActionBusy(sessionId + action);
    try {
      const body = action === "cancel" ? { reason: reason ?? "Annulé par l'administration" } : {};
      await fetch(`/api/admin/sos/${sessionId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await mutate();
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SOS — Tableau de bord live</h1>
          <p className="text-slate-500 mt-1">
            {pending.length} en attente · {accepted.length} en cours · rafraîchi toutes les 10s
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraîchir
        </button>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{pending.length}</p>
            <p className="text-sm text-red-600">En attente de médecin</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{accepted.length}</p>
            <p className="text-sm text-amber-600">Sessions en cours</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          Chargement…
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Aucune session active pour le moment</p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Sessions actives ({sessions.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {sessions
              .sort((a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime())
              .map((session) => {
                const tl = session.status === "pending" ? timeLeft(session.expires_at) : null;
                const busy = actionBusy?.startsWith(session.id) ?? false;

                return (
                  <div key={session.id} className="px-4 py-4 flex items-start gap-4 hover:bg-slate-50">
                    {/* Status icon */}
                    <div className="mt-1">
                      {session.status === "pending" ? (
                        <Clock className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/sos/${session.id}`}
                          className="font-semibold text-slate-900 hover:text-teal-600 truncate"
                        >
                          {session.patient_name ?? "Patient inconnu"}
                        </Link>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[session.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {STATUS_LABELS[session.status] ?? session.status}
                        </span>
                        {session.symptom_category && (
                          <span className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded-full">
                            {session.symptom_category}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-sm text-slate-500 flex items-center gap-3 flex-wrap">
                        <span>Demandé il y a {elapsed(session.requested_at)}</span>
                        {session.doctor_name && (
                          <span className="text-teal-700">Dr {session.doctor_name}</span>
                        )}
                        {tl && (
                          <span className={tl.urgent ? "text-red-600 font-medium" : "text-slate-500"}>
                            {tl.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/sos/${session.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 transition-colors"
                      >
                        Détails
                      </Link>
                      {session.status === "pending" && (
                        <>
                          <button
                            onClick={() => doAction(session.id, "extend")}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            +15 min
                          </button>
                          <button
                            onClick={() => {
                              const r = window.prompt("Raison d'annulation :");
                              if (r !== null) doAction(session.id, "cancel", r);
                            }}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5 inline mr-1" />
                            Annuler
                          </button>
                        </>
                      )}
                      {session.status === "accepted" && (
                        <button
                          onClick={() => {
                            const r = window.prompt("Raison d'annulation :");
                            if (r !== null) doAction(session.id, "cancel", r);
                          }}
                          disabled={busy}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 inline mr-1" />
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
