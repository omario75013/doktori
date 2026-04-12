"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Save,
  Wifi,
  Loader2,
  CheckCircle2,
  XCircle,
  History,
  ChevronRight,
} from "lucide-react";

type SettingRow = {
  key: string;
  value: string;
  category: string;
  label: string;
  description: string | null;
  type: string;
  options: string[] | null;
  updatedAt: string;
};

type Props = {
  settings: Record<string, SettingRow[]>;
};

const CATEGORY_META: Record<string, { label: string; testable?: boolean }> = {
  general: { label: "Général" },
  payment: { label: "Paiement", testable: true },
  sms: { label: "SMS", testable: true },
  email: { label: "Email", testable: true },
  whatsapp: { label: "WhatsApp", testable: true },
  teleconsult: { label: "Téléconsultation" },
  sos: { label: "SOS" },
  branding: { label: "Apparence" },
};

const CATEGORY_ORDER = ["general", "payment", "sms", "email", "whatsapp", "teleconsult", "sos", "branding"];

type ToastState = { type: "success" | "error"; message: string; key: string } | null;

export function SettingsPanel({ settings }: Props) {
  const categories = CATEGORY_ORDER.filter((c) => settings[c]);
  const [activeTab, setActiveTab] = useState(categories[0] ?? "general");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const rows of Object.values(settings)) {
      for (const row of rows) init[row.key] = row.value;
    }
    return init;
  });
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string, key: string) {
    setToast({ type, message, key });
    setTimeout(() => setToast(null), 4000);
  }

  async function saveSetting(key: string, value: string) {
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        showToast("success", "Paramètre enregistré", key);
      } else {
        const data = (await res.json()) as { error?: string };
        showToast("error", data.error ?? "Erreur lors de l'enregistrement", key);
      }
    } catch {
      showToast("error", "Erreur réseau", key);
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  function handleTest(category: string) {
    setTestResult(null);
    startTest(async () => {
      try {
        const res = await fetch("/api/admin/settings/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        const data = (await res.json()) as { success: boolean; message: string };
        setTestResult(data);
      } catch {
        setTestResult({ success: false, message: "Erreur réseau" });
      }
    });
  }

  const currentRows = settings[activeTab] ?? [];
  const meta = CATEGORY_META[activeTab];

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveTab(cat);
              setTestResult(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === cat
                ? "bg-teal-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {CATEGORY_META[cat]?.label ?? cat}
          </button>
        ))}
      </div>

      {/* Global toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Settings card */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {/* Card header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {meta?.label ?? activeTab}
            </h2>
            <Link
              href="/admin/acces/audit?resourceType=platform_settings"
              className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 mt-0.5 w-fit"
            >
              <History className="w-3 h-3" />
              Voir l&apos;historique des modifications
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {meta?.testable && (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => handleTest(activeTab)}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                Tester la connexion
              </button>
              {testResult && (
                <div
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  {testResult.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings rows */}
        {currentRows.map((row) => (
          <SettingRow
            key={row.key}
            row={row}
            value={values[row.key] ?? ""}
            showSecret={showSecret[row.key] ?? false}
            isSaving={saving[row.key] ?? false}
            isToasted={toast?.key === row.key}
            toastType={toast?.type}
            onChangeValue={(v) => setValues((prev) => ({ ...prev, [row.key]: v }))}
            onToggleSecret={() =>
              setShowSecret((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
            }
            onSave={() => saveSetting(row.key, values[row.key] ?? "")}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual setting row ───────────────────────────────────────────────────

type SettingRowProps = {
  row: SettingRow;
  value: string;
  showSecret: boolean;
  isSaving: boolean;
  isToasted: boolean;
  toastType?: "success" | "error";
  onChangeValue: (v: string) => void;
  onToggleSecret: () => void;
  onSave: () => void;
};

function SettingRow({
  row,
  value,
  showSecret,
  isSaving,
  isToasted,
  toastType,
  onChangeValue,
  onToggleSecret,
  onSave,
}: SettingRowProps) {
  const isDirty = value !== row.value;

  return (
    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-slate-800">{row.label}</label>
        {row.description && (
          <p className="text-xs text-slate-400 mt-0.5">{row.description}</p>
        )}
      </div>

      {/* Input control */}
      <div className="flex items-center gap-2 sm:w-96 shrink-0">
        {row.type === "boolean" ? (
          <BooleanToggle value={value} onChange={onChangeValue} />
        ) : row.type === "select" ? (
          <select
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {(row.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : row.type === "secret" ? (
          <div className="flex-1 relative">
            <input
              type={showSecret ? "text" : "password"}
              value={value}
              onChange={(e) => onChangeValue(e.target.value)}
              placeholder="Saisir une nouvelle valeur..."
              className="w-full px-3 py-2 pr-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
            <button
              type="button"
              onClick={onToggleSecret}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showSecret ? "Masquer" : "Afficher"}
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        ) : row.type === "number" ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            step="any"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        )}

        {/* Save button — shown when value changed or always for non-boolean */}
        {row.type !== "boolean" && (
          <button
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              isDirty
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
            aria-label="Enregistrer"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Auto-save boolean inline */}
        {row.type === "boolean" && isDirty && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors shrink-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Boolean toggle ───────────────────────────────────────────────────────────

function BooleanToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isOn = value === "true";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => onChange(isOn ? "false" : "true")}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
        isOn ? "bg-teal-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          isOn ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
