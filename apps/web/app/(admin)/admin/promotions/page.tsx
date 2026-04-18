"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Tag,
  Plus,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Pencil,
  X,
} from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  type: string;
  value: number;
  target: string;
  maxUses: number | null;
  currentUses: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  percentage: "Pourcentage",
  fixed_amount: "Montant fixe",
  free_months: "Mois gratuits",
};

const TYPE_BADGE: Record<string, string> = {
  percentage: "bg-blue-100 text-blue-700",
  fixed_amount: "bg-purple-100 text-purple-700",
  free_months: "bg-teal-100 text-teal-700",
};

const TARGET_LABELS: Record<string, string> = {
  subscription: "Abonnement",
  teleconsult: "Téléconsult",
};

function formatValue(type: string, value: number): string {
  if (type === "percentage") return `${value}%`;
  if (type === "fixed_amount") return `${(value / 1000).toFixed(0)} DT`;
  return `${value} mois`;
}

function CreatePromoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (p: PromoCode) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    type: "free_months",
    value: 1,
    target: "subscription",
    maxUses: "",
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      target: form.target,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
    };

    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      onCreated(data.promoCode);
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Créer un code promo</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="EX: SUMMER25"
              maxLength={30}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="free_months">Mois gratuits</option>
                <option value="percentage">Pourcentage</option>
                <option value="fixed_amount">Montant fixe (DT)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valeur *{" "}
                <span className="text-slate-400 font-normal">
                  {form.type === "percentage"
                    ? "(%)"
                    : form.type === "fixed_amount"
                    ? "(millimes)"
                    : "(mois)"}
                </span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cible</label>
              <select
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="subscription">Abonnement</option>
                <option value="teleconsult">Téléconsult</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Utilisations max
              </label>
              <input
                type="number"
                min={1}
                placeholder="Illimité"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valide du</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valide jusqu&apos;au
              </label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPromotionsPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/promotions")
      .then((r) => r.json())
      .then((d) => {
        setPromoCodes(d.promoCodes ?? []);
        setLoading(false);
      });
  }, []);

  function handleCreated(p: PromoCode) {
    setPromoCodes((prev) => [p, ...prev]);
  }

  function handleCopy(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleToggle(id: string, current: boolean) {
    setToggling(id);
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) {
      const data = await res.json();
      setPromoCodes((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: data.promoCode.isActive } : p))
      );
    }
    setToggling(null);
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Codes promo</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              {promoCodes.length} code{promoCodes.length !== 1 ? "s" : ""} promo
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Créer un code promo
        </button>
      </div>

      {showCreate && (
        <CreatePromoModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : promoCodes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aucun code promo pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Valeur</th>
                <th className="px-4 py-3 text-left font-medium">Cible</th>
                <th className="px-4 py-3 text-left font-medium">Utilisations</th>
                <th className="px-4 py-3 text-left font-medium">Validité</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promoCodes.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-900">{p.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        TYPE_BADGE[p.type] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {formatValue(p.type, p.value)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {TARGET_LABELS[p.target] ?? p.target}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.currentUses}
                    {p.maxUses !== null ? ` / ${p.maxUses}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    <div>{format(new Date(p.validFrom), "d MMM yyyy", { locale: fr })}</div>
                    {p.validUntil && (
                      <div className="text-slate-400">
                        → {format(new Date(p.validUntil), "d MMM yyyy", { locale: fr })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {p.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(p.code, p.id)}
                        title="Copier le code"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      >
                        {copiedId === p.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleToggle(p.id, p.isActive)}
                        disabled={toggling === p.id}
                        title={p.isActive ? "Désactiver" : "Activer"}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50"
                      >
                        {p.isActive ? (
                          <ToggleRight className="w-4 h-4 text-teal-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
