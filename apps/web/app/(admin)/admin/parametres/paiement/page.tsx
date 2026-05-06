"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, XCircle } from "lucide-react";

interface Setting {
  key: string;
  type: "boolean" | "number";
  label: string;
  description: string | null;
  value: string;
  updatedAt: string | null;
}

interface PaymentSettingsResponse {
  settings: Setting[];
  env: {
    stripeSecretConfigured: boolean;
    stripeWebhookSecretConfigured: boolean;
  };
}

const SECTIONS: Array<{
  title: string;
  description: string;
  keys: string[];
  showStripeEnv?: boolean;
}> = [
  {
    title: "Stripe (carte bancaire)",
    description:
      "Paiement par carte via Stripe Checkout. Nécessite STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET configurés côté serveur.",
    keys: ["payment.stripe.enabled", "payment.stripe.commission_percent"],
    showStripeEnv: true,
  },
  {
    title: "Virement bancaire",
    description:
      "Paiement par virement avec vérification manuelle de la preuve par un admin. Configure les IBAN par médecin via /parametres/paiement (espace médecin).",
    keys: ["payment.bank_transfer.enabled", "payment.bank_transfer.expiry_days"],
  },
  {
    title: "Espèces au cabinet",
    description: "Paiement en espèces sur place le jour du rendez-vous.",
    keys: ["payment.cash_on_premises.enabled"],
  },
];

export default function AdminPaiementPage() {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [env, setEnv] = useState<PaymentSettingsResponse["env"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/payments")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: PaymentSettingsResponse) => {
        const map: Record<string, Setting> = {};
        for (const s of data.settings) map[s.key] = s;
        setSettings(map);
        setEnv(data.env);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e.message ?? e));
        setLoading(false);
      });
  }, []);

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
    setDirty(true);
    setSuccess(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updates = Object.values(settings).map((s) => ({
        key: s.key,
        value: s.value,
      }));
      const res = await fetch("/api/admin/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof err.error === "string"
            ? err.error
            : Array.isArray(err.errors)
              ? err.errors.map((e: { key: string; error: string }) => `${e.key}: ${e.error}`).join(", ")
              : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setSuccess(true);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Paramètres de paiement</h1>
        <p className="text-slate-500 mt-1">
          Active ou désactive globalement chaque méthode de paiement et configure les paramètres
          plateforme. Les configurations par médecin (IBAN, etc.) restent dans l&apos;espace médecin.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 p-3 text-sm">
          Paramètres enregistrés.
        </div>
      )}

      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
          </div>

          {section.showStripeEnv && env && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <EnvBadge label="STRIPE_SECRET_KEY" ok={env.stripeSecretConfigured} />
              <EnvBadge
                label="STRIPE_WEBHOOK_SECRET"
                ok={env.stripeWebhookSecretConfigured}
              />
            </div>
          )}

          <div className="space-y-3">
            {section.keys.map((key) => {
              const s = settings[key];
              if (!s) return null;
              return s.type === "boolean" ? (
                <BooleanRow key={key} setting={s} onChange={(v) => update(key, v)} />
              ) : (
                <NumberRow key={key} setting={s} onChange={(v) => update(key, v)} />
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-white py-3 border-t border-slate-200">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function EnvBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      }`}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      <span className="font-mono">{label}</span>
      <span className="ml-auto">{ok ? "configuré" : "non configuré"}</span>
    </div>
  );
}

function BooleanRow({
  setting,
  onChange,
}: {
  setting: Setting;
  onChange: (value: string) => void;
}) {
  const checked = setting.value === "true";
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{setting.label}</p>
        {setting.description && (
          <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
        )}
      </div>
      <label className="inline-flex items-center cursor-pointer mt-0.5">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
      </label>
    </div>
  );
}

function NumberRow({
  setting,
  onChange,
}: {
  setting: Setting;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{setting.label}</p>
        {setting.description && (
          <p className="text-xs text-slate-500 mt-0.5">{setting.description}</p>
        )}
      </div>
      <input
        type="number"
        value={setting.value}
        onChange={(e) => onChange(e.target.value)}
        min={0}
        className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
      />
    </div>
  );
}
