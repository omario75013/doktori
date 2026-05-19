"use client";

import { useEffect, useState } from "react";
import { CreditCard, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ActorType = "doctor" | "clinic" | "lab";

type PlanOption = {
  code: string;
  label: string;
  priceMillimes: number;
  billingCycle: string;
  enabledFeatures: string[];
  maxAppointmentsPerMonth: number | null;
  maxSmsPerMonth: number | null;
  maxPatientsTotal: number | null;
};

type CurrentSubscription = {
  planCode: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  notes: string | null;
};

export function SubscriptionPanel({
  actorType,
  actorId,
}: {
  actorType: ActorType;
  actorId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selected, setSelected] = useState("");
  const [notes, setNotes] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/subscriptions/${actorType}/${actorId}`, {
        cache: "no-store",
      });
      if (r.ok) {
        const d = await r.json();
        setCurrent(d.current);
        setPlans(d.plans ?? []);
        if (d.current) {
          setSelected(d.current.planCode);
          setNotes(d.current.notes ?? "");
          setPeriodEnd(
            d.current.currentPeriodEnd ? d.current.currentPeriodEnd.slice(0, 10) : "",
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorType, actorId]);

  async function save() {
    if (!selected) {
      toast.error("Choisissez un plan");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/subscriptions/${actorType}/${actorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: selected,
          notes: notes.trim() || null,
          currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
        }),
      });
      if (r.ok) {
        toast.success("Plan enregistré");
        void load();
      } else {
        const data = await r.json().catch(() => null);
        toast.error(data?.error ?? "Échec");
      }
    } finally {
      setSaving(false);
    }
  }

  async function unassign() {
    if (!confirm("Retirer le plan ? L'utilisateur repassera en libre / sans limites.")) return;
    const r = await fetch(`/api/admin/subscriptions/${actorType}/${actorId}`, {
      method: "DELETE",
    });
    if (r.ok) {
      toast.success("Plan retiré");
      setCurrent(null);
      setSelected("");
      setNotes("");
      setPeriodEnd("");
    } else {
      toast.error("Échec");
    }
  }

  const selectedPlan = plans.find((p) => p.code === selected);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-teal-600" />
          <h3 className="font-semibold text-slate-900">Abonnement</h3>
        </div>
        {current && (
          <button
            onClick={unassign}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Retirer
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 italic">Chargement…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun plan applicable pour ce type d&apos;utilisateur. Créez-en un dans{" "}
          <a href="/admin/plans" className="text-teal-600 underline">
            Plans d&apos;abonnement
          </a>
          .
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Plan</div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">— Aucun —</option>
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label} ({(p.priceMillimes / 1000).toFixed(3)} TND / {p.billingCycle})
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
              <div>
                <span className="text-slate-500">RDV/mois:</span>{" "}
                <span className="font-medium text-slate-900">
                  {selectedPlan.maxAppointmentsPerMonth ?? "∞"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">SMS/mois:</span>{" "}
                <span className="font-medium text-slate-900">
                  {selectedPlan.maxSmsPerMonth ?? "∞"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Patients (total):</span>{" "}
                <span className="font-medium text-slate-900">
                  {selectedPlan.maxPatientsTotal ?? "∞"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Modules:</span>{" "}
                {selectedPlan.enabledFeatures.length === 0 ? (
                  <span className="italic text-slate-500">Tous</span>
                ) : (
                  <span className="font-medium text-slate-900">
                    {selectedPlan.enabledFeatures.join(", ")}
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Fin de période (optionnel)
            </div>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes (raison de l'attribution, accord commercial, etc.)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={save}
            disabled={saving || !selected}
            className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : current ? "Mettre à jour le plan" : "Attribuer le plan"}
          </button>

          {current && (
            <p className="text-[11px] text-slate-500 text-center">
              Statut actuel: <span className="font-medium">{current.status}</span>
              {current.currentPeriodEnd && (
                <>
                  {" · "}expire le{" "}
                  {new Date(current.currentPeriodEnd).toLocaleDateString("fr-FR")}
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
