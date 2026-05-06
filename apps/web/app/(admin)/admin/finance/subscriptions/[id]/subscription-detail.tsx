"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Webhook, ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  price_millimes: number;
  payment_provider: string | null;
  external_ref: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  doctor_id: string | null;
  doctor_name: string | null;
  doctor_email: string | null;
  doctor_specialty: string | null;
  doctor_city: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  active: "Actif",
  expired: "Expiré",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600",
  essentiel: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
  clinique: "bg-teal-50 text-teal-700",
};

function formatDT(millimes: number): string {
  return (millimes / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-TN");
}

interface TimelineEvent {
  label: string;
  date: string | null;
  icon: React.ElementType;
  color: string;
}

interface WebhookEvent {
  event_id: string;
  event_type: string;
  processed_at: string;
  payload: unknown;
}

export function SubscriptionDetail({
  subscription: sub,
  events = [],
}: {
  subscription: Record<string, unknown>;
  events?: WebhookEvent[];
}) {
  const s = sub as unknown as SubscriptionData;
  const router = useRouter();
  const [extendMonths, setExtendMonths] = useState(1);
  const [extending, setExtending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const timeline: TimelineEvent[] = [
    { label: "Créé", date: s.created_at, icon: Clock, color: "text-slate-500 bg-slate-100" },
    { label: "Début", date: s.starts_at, icon: Calendar, color: "text-blue-600 bg-blue-50" },
    ...(s.status === "active" || s.status === "expired"
      ? [{ label: "Fin prévue", date: s.ends_at, icon: Calendar, color: "text-slate-500 bg-slate-100" }]
      : []),
    ...(s.cancelled_at
      ? [{ label: "Annulé", date: s.cancelled_at, icon: XCircle, color: "text-red-600 bg-red-50" }]
      : []),
    ...(s.status === "active"
      ? [{ label: "Actif", date: null, icon: CheckCircle2, color: "text-green-600 bg-green-50" }]
      : []),
    ...(s.status === "expired"
      ? [{ label: "Expiré", date: s.ends_at, icon: AlertCircle, color: "text-amber-600 bg-amber-50" }]
      : []),
  ];

  async function handleExtend() {
    setExtending(true);
    setActionError(null);
    try {
      const r = await fetch(`/api/admin/finance/subscriptions/${s.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: extendMonths }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      router.refresh();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setExtending(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setActionError(null);
    try {
      const r = await fetch(`/api/admin/finance/subscriptions/${s.id}/cancel`, {
        method: "POST",
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      setShowCancelConfirm(false);
      router.refresh();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/finance/subscriptions"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux abonnements
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${PLAN_COLORS[s.plan] ?? "bg-slate-100 text-slate-600"}`}>
                {s.plan.charAt(0).toUpperCase() + s.plan.slice(1)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {s.doctor_name ?? "Médecin inconnu"}
            </h1>
            {s.doctor_email && (
              <p className="text-sm text-slate-500 mt-1">{s.doctor_email}</p>
            )}
            {(s.doctor_specialty || s.doctor_city) && (
              <p className="text-sm text-slate-400 mt-0.5">
                {[s.doctor_specialty, s.doctor_city].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">{formatDT(s.price_millimes)}</p>
            <p className="text-sm text-slate-500 mt-1 capitalize">{s.billing_cycle}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">ID</dt>
              <dd className="font-mono text-xs text-slate-700">{s.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Fournisseur de paiement</dt>
              <dd className="text-slate-700">{s.payment_provider ?? "—"}</dd>
            </div>
            {s.external_ref && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Réf. externe</dt>
                <dd className="font-mono text-xs text-slate-700">{s.external_ref}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Début</dt>
              <dd className="text-slate-700">{fmtDate(s.starts_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Fin</dt>
              <dd className="text-slate-700">{fmtDate(s.ends_at)}</dd>
            </div>
            {s.cancelled_at && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Annulé le</dt>
                <dd className="text-red-700">{fmtDate(s.cancelled_at)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">Dernière MAJ</dt>
              <dd className="text-slate-700">{fmtDate(s.updated_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Chronologie</h2>
          <ol className="relative ml-3 border-l border-slate-200 space-y-5">
            {timeline.map((event, i) => {
              const Icon = event.icon;
              return (
                <li key={i} className="ml-5">
                  <span className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 ${event.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <p className="text-sm font-medium text-slate-900">{event.label}</p>
                  {event.date && (
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(event.date)}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Webhook events viewer (Wave 6) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Webhooks reçus</h2>
          <span className="ml-auto text-xs text-slate-400">{events.length} événement{events.length > 1 ? "s" : ""}</span>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucun webhook reçu pour cet abonnement.
            {s.payment_provider && s.payment_provider !== "stripe" && (
              <> Provider actuel: <span className="font-medium text-slate-600">{s.payment_provider}</span> (les webhooks sont gérés via leur propre canal).</>
            )}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((evt) => {
              const isOpen = expandedEvent === evt.event_id;
              return (
                <li key={evt.event_id} className="py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedEvent(isOpen ? null : evt.event_id)}
                    className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-md px-2 py-1 -mx-2 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-mono text-xs text-slate-500 truncate">{evt.event_id}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {evt.event_type}
                    </span>
                    <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">{fmtDate(evt.processed_at)}</span>
                  </button>
                  {isOpen && (
                    <pre className="mt-2 ml-6 p-3 bg-slate-50 border border-slate-100 rounded-md text-xs text-slate-700 overflow-auto max-h-80">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Actions */}
      {s.status !== "cancelled" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>

          {actionError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {actionError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Extend */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-4 flex-1">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-2">Prolonger l'abonnement</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-blue-700 whitespace-nowrap">Mois à ajouter :</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={extendMonths}
                    onChange={(e) => setExtendMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 px-2 py-1 text-sm border border-blue-200 rounded bg-white"
                  />
                </div>
              </div>
              <button
                onClick={handleExtend}
                disabled={extending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {extending ? "…" : "Prolonger"}
              </button>
            </div>

            {/* Cancel */}
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
              >
                Annuler l'abonnement
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 flex-1">
                <p className="text-sm text-red-800 flex-1">
                  Confirmer l'annulation de cet abonnement ?
                </p>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white hover:bg-slate-50"
                >
                  Non
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? "…" : "Confirmer"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
