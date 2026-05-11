"use client";

import { useEffect, useState } from "react";
import { CreditCard, Building2, Banknote, Globe2, Loader2, Save } from "lucide-react";

type Method = "stripe_card" | "bank_transfer" | "cash_on_premises" | "flouci" | "paymee";

interface MethodRow {
  method: Method;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface BankConfig {
  iban?: string;
  bic?: string;
  bankName?: string;
  accountHolder?: string;
}

const METHODS: { id: Method; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "stripe_card", label: "Carte bancaire (Stripe)", description: "Cartes internationales via Stripe Checkout.", icon: CreditCard },
  { id: "bank_transfer", label: "Virement bancaire", description: "Virement avec validation manuelle par l'admin Doktori.", icon: Building2 },
  { id: "cash_on_premises", label: "Espèces au cabinet", description: "Le patient règle sur place le jour du RDV.", icon: Banknote },
  { id: "flouci", label: "Flouci", description: "Paiement local Tunisie via Flouci.", icon: Globe2 },
  { id: "paymee", label: "Paymee", description: "Paiement local Tunisie via Paymee.", icon: Globe2 },
];

export default function PaymentMethodsPage() {
  const [rows, setRows] = useState<Record<Method, MethodRow>>({} as Record<Method, MethodRow>);
  const [loading, setLoading] = useState(true);
  const [savingMethod, setSavingMethod] = useState<Method | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/medecin/payment-methods")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erreur de chargement"))))
      .then((data) => {
        const next: Record<Method, MethodRow> = {} as Record<Method, MethodRow>;
        for (const m of METHODS) {
          const existing = (data.methods as MethodRow[]).find((x) => x.method === m.id);
          next[m.id] = existing ?? { method: m.id, enabled: false, config: {} };
        }
        setRows(next);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e.message ?? e));
        setLoading(false);
      });
  }, []);

  async function save(method: Method, patch: Partial<MethodRow>) {
    setSavingMethod(method);
    setError(null);
    const next = { ...rows[method], ...patch };
    setRows((prev) => ({ ...prev, [method]: next }));
    try {
      const res = await fetch("/api/medecin/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Échec de la sauvegarde");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingMethod(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Méthodes de paiement</h1>
        <p className="text-sm text-gray-600 mt-1">
          Activez les méthodes de paiement que vos patients peuvent utiliser pour régler leurs consultations.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {METHODS.map((m) => {
          const row = rows[m.id];
          const Icon = m.icon;
          const isBank = m.id === "bank_transfer";
          const bankConfig = (row.config ?? {}) as BankConfig;

          return (
            <div key={m.id} className="ds-card p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-gray-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{m.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={row.enabled}
                        disabled={savingMethod === m.id}
                        onChange={(e) => save(m.id, { enabled: e.target.checked })}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foreground" />
                    </label>
                  </div>

                  {isBank && row.enabled && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <BankField label="Titulaire du compte" value={bankConfig.accountHolder ?? ""} onChange={(v) => save("bank_transfer", { config: { ...bankConfig, accountHolder: v } })} disabled={savingMethod === "bank_transfer"} />
                      <BankField label="IBAN" value={bankConfig.iban ?? ""} onChange={(v) => save("bank_transfer", { config: { ...bankConfig, iban: v } })} disabled={savingMethod === "bank_transfer"} />
                      <BankField label="BIC" value={bankConfig.bic ?? ""} onChange={(v) => save("bank_transfer", { config: { ...bankConfig, bic: v } })} disabled={savingMethod === "bank_transfer"} />
                      <BankField label="Nom de la banque" value={bankConfig.bankName ?? ""} onChange={(v) => save("bank_transfer", { config: { ...bankConfig, bankName: v } })} disabled={savingMethod === "bank_transfer"} />
                    </div>
                  )}

                  {savingMethod === m.id && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <Save className="h-3 w-3 animate-pulse" /> Enregistrement…
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Modifications enregistrées automatiquement. La méthode &laquo; carte bancaire &raquo; nécessite l&apos;activation
        globale par l&apos;administrateur Doktori avant de pouvoir être proposée aux patients.
      </p>
    </div>
  );
}

function BankField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onChange(local); }}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </label>
  );
}
