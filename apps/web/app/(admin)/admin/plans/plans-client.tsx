"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  code: string;
  label: string;
  priceMillimes: number;
  billingCycle: string;
  targetType: string;
  description: string | null;
  features: string[];
  enabledFeatures: string[];
  maxAppointmentsPerMonth: number | null;
  maxSmsPerMonth: number | null;
  maxPatientsTotal: number | null;
  extraRules: Record<string, number | boolean | string>;
  displayOrder: number;
  isActive: boolean;
};

const KNOWN_FEATURES = [
  "teleconsult",
  "sms",
  "wallet",
  "stats",
  "secretaries",
  "modeles",
  "labOrders",
  "messagerie",
  "homeVisits",
  "coachIa",
  "referrals",
] as const;

const TARGET_LABELS: Record<string, string> = {
  doctor: "Médecin",
  clinic: "Clinique",
  lab: "Laboratoire",
  all: "Tous",
};

export function PlansClient({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(id: string, label: string) {
    if (!confirm(`Supprimer le plan "${label}" ?`)) return;
    const r = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Plan supprimé");
      startTransition(() => router.refresh());
    } else {
      toast.error("Échec de la suppression");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau plan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Libellé</th>
              <th className="px-4 py-3 font-semibold">Cible</th>
              <th className="px-4 py-3 font-semibold">Prix</th>
              <th className="px-4 py-3 font-semibold">Limites</th>
              <th className="px-4 py-3 font-semibold">Modules</th>
              <th className="px-4 py-3 font-semibold">Actif</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{p.label}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                    {TARGET_LABELS[p.targetType] ?? p.targetType}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {(p.priceMillimes / 1000).toFixed(3)} TND / {p.billingCycle === "monthly" ? "mois" : p.billingCycle}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <div>RDV: {p.maxAppointmentsPerMonth ?? "∞"}/mois</div>
                  <div>SMS: {p.maxSmsPerMonth ?? "∞"}/mois</div>
                  <div>Patients: {p.maxPatientsTotal ?? "∞"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[240px]">
                    {p.enabledFeatures.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">Tous</span>
                    ) : (
                      p.enabledFeatures.map((f) => (
                        <span
                          key={f}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-teal-50 text-teal-700"
                        >
                          {f}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.isActive ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
                      Oui
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                      Non
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditing(p)}
                      disabled={pending}
                      className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => remove(p.id, p.label)}
                      disabled={pending}
                      className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  Aucun plan. Cliquez sur &quot;Nouveau plan&quot; pour en créer un.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <PlanDialog
          plan={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function PlanDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    code: plan?.code ?? "",
    label: plan?.label ?? "",
    priceMillimes: plan?.priceMillimes ?? 0,
    billingCycle: plan?.billingCycle ?? "monthly",
    targetType: plan?.targetType ?? "doctor",
    description: plan?.description ?? "",
    maxAppointmentsPerMonth: plan?.maxAppointmentsPerMonth ?? null,
    maxSmsPerMonth: plan?.maxSmsPerMonth ?? null,
    maxPatientsTotal: plan?.maxPatientsTotal ?? null,
    enabledFeatures: plan?.enabledFeatures ?? [],
    isActive: plan?.isActive ?? true,
    displayOrder: plan?.displayOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  function toggleFeature(key: string) {
    setForm((f) => ({
      ...f,
      enabledFeatures: f.enabledFeatures.includes(key)
        ? f.enabledFeatures.filter((x) => x !== key)
        : [...f.enabledFeatures, key],
    }));
  }

  async function save() {
    if (!form.code || !form.label) {
      toast.error("Code et libellé requis");
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/plans/${plan!.id}` : "/api/admin/plans";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(isEdit ? "Plan modifié" : "Plan créé");
        onSaved();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erreur");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">
            {isEdit ? `Modifier ${plan!.label}` : "Nouveau plan"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code (slug, unique)">
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={isEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                placeholder="basic"
              />
            </Field>
            <Field label="Libellé">
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Plan Basic"
              />
            </Field>
            <Field label="Cible">
              <select
                value={form.targetType}
                onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              >
                <option value="doctor">Médecin</option>
                <option value="clinic">Clinique</option>
                <option value="lab">Laboratoire</option>
                <option value="all">Tous</option>
              </select>
            </Field>
            <Field label="Prix (millimes)">
              <input
                type="number"
                value={form.priceMillimes}
                onChange={(e) =>
                  setForm({ ...form, priceMillimes: Number(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Cycle de facturation">
              <select
                value={form.billingCycle}
                onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              >
                <option value="monthly">Mensuel</option>
                <option value="quarterly">Trimestriel</option>
                <option value="yearly">Annuel</option>
              </select>
            </Field>
            <Field label="Ordre d'affichage">
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({ ...form, displayOrder: Number(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Limites (laisser vide = illimité)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="RDV / mois">
                <input
                  type="number"
                  value={form.maxAppointmentsPerMonth ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxAppointmentsPerMonth: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="∞"
                />
              </Field>
              <Field label="SMS / mois">
                <input
                  type="number"
                  value={form.maxSmsPerMonth ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxSmsPerMonth: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="∞"
                />
              </Field>
              <Field label="Patients (total)">
                <input
                  type="number"
                  value={form.maxPatientsTotal ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxPatientsTotal: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="∞"
                />
              </Field>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Modules activés (vide = tous)
            </div>
            <div className="flex flex-wrap gap-2">
              {KNOWN_FEATURES.map((f) => {
                const on = form.enabledFeatures.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      on
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Plan actif (visible et assignable)
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : isEdit ? "Modifier" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      {children}
    </div>
  );
}
