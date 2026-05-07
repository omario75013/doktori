/**
 * Admin UI — runtime configuration of the patient-facing Coach IA.
 *
 * Lets a super_admin:
 *   - toggle `feature_flags.coach_ia_enabled`
 *   - tune the per-patient + global rate limits (24h windows)
 *   - tune the daily cost cap (USD)
 *   - edit the disclaimer HTML shown before the first conversation,
 *     with a sandboxed live preview
 *
 * Saves go to POST /api/admin/coach-ia/settings, which audit-logs every
 * mutation and invalidates the platform-settings cache.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";

interface RegisteredSetting {
  key: string;
  type: "number" | "text";
  label: string;
  description: string | null;
  value: string;
  updatedAt: string | null;
}

interface SettingsResponse {
  settings: RegisteredSetting[];
  enabled: boolean;
}

const KEYS = {
  ratePerPatient: "coach_ia.rate_limit_per_patient",
  rateGlobal: "coach_ia.rate_limit_global",
  dailyCostCapUsd: "coach_ia.daily_cost_cap_usd",
  disclaimerHtml: "coach_ia.disclaimer_html",
} as const;

export default function AdminCoachIaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [ratePerPatient, setRatePerPatient] = useState("10");
  const [rateGlobal, setRateGlobal] = useState("1000");
  const [dailyCostCapUsd, setDailyCostCapUsd] = useState("5");
  const [disclaimerHtml, setDisclaimerHtml] = useState("");

  const [initial, setInitial] = useState<{
    enabled: boolean;
    ratePerPatient: string;
    rateGlobal: string;
    dailyCostCapUsd: string;
    disclaimerHtml: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/coach-ia/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: SettingsResponse) => {
        if (cancelled) return;
        const map: Record<string, RegisteredSetting> = {};
        for (const s of data.settings) map[s.key] = s;

        const next = {
          enabled: data.enabled,
          ratePerPatient: map[KEYS.ratePerPatient]?.value ?? "10",
          rateGlobal: map[KEYS.rateGlobal]?.value ?? "1000",
          dailyCostCapUsd: map[KEYS.dailyCostCapUsd]?.value ?? "5",
          disclaimerHtml: map[KEYS.disclaimerHtml]?.value ?? "",
        };

        setEnabled(next.enabled);
        setRatePerPatient(next.ratePerPatient);
        setRateGlobal(next.rateGlobal);
        setDailyCostCapUsd(next.dailyCostCapUsd);
        setDisclaimerHtml(next.disclaimerHtml);
        setInitial(next);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e instanceof Error ? e.message : e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(() => {
    if (!initial) return false;
    return (
      initial.enabled !== enabled ||
      initial.ratePerPatient !== ratePerPatient ||
      initial.rateGlobal !== rateGlobal ||
      initial.dailyCostCapUsd !== dailyCostCapUsd ||
      initial.disclaimerHtml !== disclaimerHtml
    );
  }, [initial, enabled, ratePerPatient, rateGlobal, dailyCostCapUsd, disclaimerHtml]);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const body: Record<string, unknown> = {};
      if (initial?.enabled !== enabled) body.enabled = enabled;
      if (initial?.ratePerPatient !== ratePerPatient) {
        const n = parseInt(ratePerPatient, 10);
        if (!Number.isFinite(n) || n < 1) throw new Error("Limite par patient invalide");
        body.ratePerPatient = n;
      }
      if (initial?.rateGlobal !== rateGlobal) {
        const n = parseInt(rateGlobal, 10);
        if (!Number.isFinite(n) || n < 1) throw new Error("Limite globale invalide");
        body.rateGlobal = n;
      }
      if (initial?.dailyCostCapUsd !== dailyCostCapUsd) {
        const n = parseFloat(dailyCostCapUsd);
        if (!Number.isFinite(n) || n <= 0) throw new Error("Plafond coût invalide");
        body.dailyCostCapUsd = n;
      }
      if (initial?.disclaimerHtml !== disclaimerHtml) {
        if (disclaimerHtml.trim().length < 50) {
          throw new Error("Disclaimer trop court (min. 50 caractères)");
        }
        body.disclaimerHtml = disclaimerHtml;
      }

      if (Object.keys(body).length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/coach-ia/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data?.error === "string"
            ? data.error
            : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setInitial({
        enabled,
        ratePerPatient,
        rateGlobal,
        dailyCostCapUsd,
        disclaimerHtml,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
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
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Coach IA — Configuration</h1>
          <p className="text-slate-500 mt-1">
            Active ou désactive le Coach IA pour les patients et règle les limites de
            consommation. Les modifications prennent effet sous 60 secondes.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Paramètres enregistrés.
        </div>
      )}

      {/* Toggle */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Activation</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Désactivé, la page <code className="text-xs bg-slate-100 px-1 rounded">/coach-ia</code>{" "}
              affiche un message « bientôt disponible » et l&apos;API renvoie 403.
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          État actuel :{" "}
          <strong className={enabled ? "text-teal-700" : "text-slate-700"}>
            {enabled ? "ACTIVÉ" : "DÉSACTIVÉ"}
          </strong>
        </p>
      </section>

      {/* Limits */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Limites</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Garde-fous anti-abus, glissants sur 24h. La limite atteinte renvoie un{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">429</code> au patient.
          </p>
        </div>
        <NumberRow
          label="Par patient (24h)"
          description="Nombre maximum de messages par patient toutes les 24h."
          value={ratePerPatient}
          onChange={setRatePerPatient}
          min={1}
          max={1000}
          step={1}
        />
        <NumberRow
          label="Globale (24h)"
          description="Nombre maximum de messages tous patients confondus toutes les 24h."
          value={rateGlobal}
          onChange={setRateGlobal}
          min={1}
          max={100000}
          step={1}
        />
      </section>

      {/* Cost cap */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Coût</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Si le coût cumulé du jour dépasse ce plafond, les nouveaux appels sont rejetés
            jusqu&apos;à minuit (UTC).
          </p>
        </div>
        <NumberRow
          label="Plafond quotidien"
          description="Coût quotidien maximum (USD) avant arrêt automatique."
          value={dailyCostCapUsd}
          onChange={setDailyCostCapUsd}
          suffix="USD"
          min={0.1}
          max={1000}
          step={0.1}
        />
      </section>

      {/* Disclaimer */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Disclaimer</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Texte du disclaimer affiché au patient avant sa première conversation. HTML
            autorisé : <code className="text-xs bg-slate-100 px-1 rounded">strong</code>,{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">a</code>,{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">p</code>,{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">ul</code>,{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">li</code>,{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">br</code>.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Code HTML
            </label>
            <textarea
              value={disclaimerHtml}
              onChange={(e) => setDisclaimerHtml(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono leading-5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              {disclaimerHtml.length} caractères.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Aperçu
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-gray-700 space-y-2 prose prose-sm max-w-none">
              {/* Admin-curated content; super_admin role is required to write
                  this field. We render via dangerouslySetInnerHTML so the
                  preview matches the patient-side modal output exactly. */}
              <div dangerouslySetInnerHTML={{ __html: disclaimerHtml }} />
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-white py-3 border-t border-slate-200">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function NumberRow({
  label,
  description,
  value,
  onChange,
  suffix,
  min,
  max,
  step,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}
