"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Pencil, X, Check } from "lucide-react";

interface Plan {
  id: string;
  code: string;
  label: string;
  priceMillimes: number;
  billingCycle: string;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  maxAppointmentsPerMonth: number | null;
  maxSmsPerMonth: number | null;
  maxPatientsTotal: number | null;
  enabledFeatures: string[];
}

interface ApiResponse {
  plans: Plan[];
}

async function fetcher(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<ApiResponse>;
}

function formatDT(millimes: number): string {
  return (millimes / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
}

interface EditModalProps {
  plan: Plan;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ plan, onClose, onSaved }: EditModalProps) {
  const [label, setLabel] = useState(plan.label);
  const [priceMillimes, setPriceMillimes] = useState(String(plan.priceMillimes));
  const [features, setFeatures] = useState(plan.features.join("\n"));
  const [isActive, setIsActive] = useState(plan.isActive);
  const [displayOrder, setDisplayOrder] = useState(String(plan.displayOrder));
  const [maxAppts, setMaxAppts] = useState(plan.maxAppointmentsPerMonth !== null ? String(plan.maxAppointmentsPerMonth) : "");
  const [maxSms, setMaxSms] = useState(plan.maxSmsPerMonth !== null ? String(plan.maxSmsPerMonth) : "");
  const [maxPatients, setMaxPatients] = useState(plan.maxPatientsTotal !== null ? String(plan.maxPatientsTotal) : "");
  const [enabledFeatures, setEnabledFeatures] = useState((plan.enabledFeatures ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const priceNum = parseInt(priceMillimes, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Le prix doit être un entier >= 0 (en millimes).");
      return;
    }
    const orderNum = parseInt(displayOrder, 10);
    if (isNaN(orderNum)) {
      setError("L'ordre d'affichage doit être un entier.");
      return;
    }
    const featuresArr = features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const r = await fetch(`/api/admin/finance/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          priceMillimes: priceNum,
          features: featuresArr,
          isActive,
          displayOrder: orderNum,
          maxAppointmentsPerMonth: maxAppts.trim() ? parseInt(maxAppts, 10) : null,
          maxSmsPerMonth: maxSms.trim() ? parseInt(maxSms, 10) : null,
          maxPatientsTotal: maxPatients.trim() ? parseInt(maxPatients, 10) : null,
          enabledFeatures: enabledFeatures.split("\n").map((f) => f.trim()).filter(Boolean),
        }),
      });
      if (!r.ok) {
        const d = (await r.json()) as { error?: string };
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Modifier le plan <span className="font-mono text-teal-600">{plan.code}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Libellé</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prix (millimes)
              <span className="ml-1 text-xs text-slate-400 font-normal">
                ={" "}{formatDT(parseInt(priceMillimes, 10) || 0)}
              </span>
            </label>
            <input
              type="number"
              min={0}
              value={priceMillimes}
              onChange={(e) => setPriceMillimes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fonctionnalités
              <span className="ml-1 text-xs text-slate-400 font-normal">(une par ligne)</span>
            </label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ordre d'affichage</label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Limites du plan (vide = illimité)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">RDV / mois</label>
                <input type="number" min={0} value={maxAppts} onChange={(e) => setMaxAppts(e.target.value)}
                  placeholder="∞" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">SMS / mois</label>
                <input type="number" min={0} value={maxSms} onChange={(e) => setMaxSms(e.target.value)}
                  placeholder="∞" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Patients total</label>
                <input type="number" min={0} value={maxPatients} onChange={(e) => setMaxPatients(e.target.value)}
                  placeholder="∞" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fonctionnalités activées
              <span className="ml-1 text-xs text-slate-400 font-normal">(une par ligne : teleconsult, stats, wallet, parrainage, cnam, reseau)</span>
            </label>
            <textarea value={enabledFeatures} onChange={(e) => setEnabledFeatures(e.target.value)}
              rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              placeholder="teleconsult&#10;stats&#10;wallet" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsActive(!isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative ${isActive ? "bg-teal-500" : "bg-slate-200"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? "left-5" : "left-1"}`}
              />
            </div>
            <span className="text-sm font-medium text-slate-700">Plan actif</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPlansPage() {
  const { data, isLoading, mutate } = useSWR<ApiResponse>("/api/admin/finance/plans", fetcher);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const plans = data?.plans ?? [];

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-2">
        <Link
          href="/admin/finance"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Finance
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Catalogue des plans</h1>
        <p className="text-slate-500 mt-1">
          Gérer les plans tarifaires affichés aux médecins
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Ordre</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Libellé</th>
                <th className="px-4 py-3 font-semibold">Prix</th>
                <th className="px-4 py-3 font-semibold">Cycle</th>
                <th className="px-4 py-3 font-semibold">Fonctionnalités</th>
                <th className="px-4 py-3 font-semibold">Actif</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && plans.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Aucun plan trouvé
                  </td>
                </tr>
              )}
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 tabular-nums text-slate-500 text-center">
                    {plan.displayOrder}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {plan.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{plan.label}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {formatDT(plan.priceMillimes)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{plan.billingCycle}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {plan.features.map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded-full"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {plan.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-full font-medium">
                        <Check className="w-3 h-3" />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full font-medium">
                        <X className="w-3 h-3" />
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingPlan && (
        <EditModal
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={() => mutate()}
        />
      )}
    </div>
  );
}
