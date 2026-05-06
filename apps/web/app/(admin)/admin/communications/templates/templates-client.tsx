"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  MessageSquare,
  MessageCircle,
  Bell,
  Mail,
  Plus,
  X,
  Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = "sms" | "whatsapp" | "push" | "email";
type Language = "fr" | "ar" | "en";

type Template = {
  id: string;
  key: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: string[] | null;
  language: string;
  isActive: boolean;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Filters = {
  channel: string;
  language: string;
  isActive: string; // "", "true", "false"
};

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "push", label: "Push" },
  { value: "email", label: "Email" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return Array.from(set);
}

const KEY_RX = /^[a-z0-9_.-]+$/i;

// ─── Channel UI ───────────────────────────────────────────────────────────────

function channelIcon(channel: string) {
  switch (channel) {
    case "sms":
      return <MessageSquare className="w-4 h-4" />;
    case "whatsapp":
      return <MessageCircle className="w-4 h-4" />;
    case "push":
      return <Bell className="w-4 h-4" />;
    case "email":
      return <Mail className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function channelStyle(channel: string): string {
  switch (channel) {
    case "sms":
      return "bg-teal-50 text-teal-700 ring-teal-200";
    case "whatsapp":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "push":
      return "bg-indigo-50 text-indigo-700 ring-indigo-200";
    case "email":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${channelStyle(
        channel
      )}`}
    >
      {channelIcon(channel)}
      {channel}
    </span>
  );
}

function LanguageBadge({ language }: { language: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-mono font-semibold ring-1 ring-inset ring-slate-200">
      {language.toUpperCase()}
    </span>
  );
}

// ─── Modal — Create / Edit ────────────────────────────────────────────────────

type EditableForm = {
  key: string;
  name: string;
  channel: Channel;
  language: Language;
  subject: string;
  body: string;
  variables: string;
};

function emptyForm(): EditableForm {
  return {
    key: "",
    name: "",
    channel: "sms",
    language: "fr",
    subject: "",
    body: "",
    variables: "",
  };
}

function formFromTemplate(t: Template): EditableForm {
  return {
    key: t.key,
    name: t.name,
    channel: (t.channel as Channel) ?? "sms",
    language: (t.language as Language) ?? "fr",
    subject: t.subject ?? "",
    body: t.body,
    variables: (t.variables ?? []).join(", "),
  };
}

function TemplateModal({
  mode,
  template,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  template?: Template;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [form, setForm] = useState<EditableForm>(
    template ? formFromTemplate(template) : emptyForm()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<Record<string, string>>({});

  const detectedVars = useMemo(() => detectVariables(form.body), [form.body]);
  const declaredVars = useMemo(
    () =>
      form.variables
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [form.variables]
  );
  const missingVars = detectedVars.filter((v) => !declaredVars.includes(v));
  const extraVars = declaredVars.filter((v) => !detectedVars.includes(v));

  const showSubject = form.channel === "email" || form.channel === "push";

  function validate(): boolean {
    const v: Record<string, string> = {};
    if (mode === "create") {
      if (!form.key.trim()) v.key = "Clé requise";
      else if (!KEY_RX.test(form.key.trim()))
        v.key = "Caractères autorisés: a-z, 0-9, _ . -";
    }
    if (!form.name.trim()) v.name = "Nom requis";
    if (!form.body.trim()) v.body = "Corps requis";
    setValidation(v);
    return Object.keys(v).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        body: form.body,
        language: form.language,
        variables: declaredVars,
      };
      if (showSubject) payload.subject = form.subject.trim() || null;

      if (mode === "create") {
        payload.key = form.key.trim();
        payload.channel = form.channel;
        const res = await fetch("/api/admin/communications/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? "Erreur de création");
          return;
        }
      } else {
        if (!template) return;
        const res = await fetch(
          `/api/admin/communications/templates/${template.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? "Erreur de mise à jour");
          return;
        }
      }
      onSaved();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive() {
    if (!template) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/communications/templates/${template.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !template.isActive }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Erreur");
        return;
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!template) return;
    if (
      !window.confirm(
        "Supprimer cette template ? Elle sera désactivée mais conservée pour audit."
      )
    )
      return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/communications/templates/${template.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Erreur de suppression");
        return;
      }
      onDeleted?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {mode === "create" ? "Nouveau modèle" : "Éditer modèle"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-auto px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {/* Left column — main fields */}
          <div className="md:col-span-2 space-y-4">
            {/* Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Clé{" "}
                {mode === "edit" && (
                  <span className="text-slate-400 normal-case">(immuable)</span>
                )}
              </label>
              <input
                type="text"
                value={form.key}
                disabled={mode === "edit"}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="appointment_reminder_24h"
                className="w-full text-sm font-mono rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
              {validation.key && (
                <p className="text-xs text-red-600 mt-1">{validation.key}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Nom
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rappel rendez-vous J-1"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {validation.name && (
                <p className="text-xs text-red-600 mt-1">{validation.name}</p>
              )}
            </div>

            {/* Channel + Language */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Canal{" "}
                  {mode === "edit" && (
                    <span className="text-slate-400 normal-case">(immuable)</span>
                  )}
                </label>
                <select
                  value={form.channel}
                  disabled={mode === "edit"}
                  onChange={(e) =>
                    setForm({ ...form, channel: e.target.value as Channel })
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Langue
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value as Language })
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject (only for email / push) */}
            {showSubject && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  {form.channel === "email" ? "Sujet email" : "Titre push"}
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder={
                    form.channel === "email"
                      ? "Confirmation de votre rendez-vous"
                      : "Rappel rendez-vous"
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Corps du message
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Bonjour {{patientName}}, votre rendez-vous avec Dr {{doctorName}} est prévu le {{appointmentDate}}."
                rows={8}
                className="w-full text-sm font-mono rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {validation.body && (
                <p className="text-xs text-red-600 mt-1">{validation.body}</p>
              )}
            </div>

            {/* Variables */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Variables (séparées par virgule)
              </label>
              <input
                type="text"
                value={form.variables}
                onChange={(e) =>
                  setForm({ ...form, variables: e.target.value })
                }
                placeholder="patientName, doctorName, appointmentDate"
                className="w-full text-sm font-mono rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Right column — variable preview */}
          <div className="md:col-span-1">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sticky top-0">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Placeholders détectés
              </h3>
              {detectedVars.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Aucun placeholder détecté. Utilisez {`{{variable}}`} dans le
                  corps.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {detectedVars.map((v) => {
                    const declared = declaredVars.includes(v);
                    return (
                      <li
                        key={v}
                        className={`flex items-center justify-between rounded-md px-2 py-1 text-xs font-mono ${
                          declared
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <span>{`{{${v}}}`}</span>
                        <span className="text-[10px] uppercase tracking-wide">
                          {declared ? "OK" : "manquant"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {missingVars.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const merged = Array.from(
                      new Set([...declaredVars, ...missingVars])
                    );
                    setForm({ ...form, variables: merged.join(", ") });
                  }}
                  className="mt-3 w-full text-xs font-semibold text-teal-700 hover:text-teal-800 bg-white border border-teal-200 rounded-md px-2 py-1.5 transition-colors"
                >
                  Ajouter les variables manquantes
                </button>
              )}

              {extraVars.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Déclarées non utilisées
                  </h4>
                  <ul className="space-y-1">
                    {extraVars.map((v) => (
                      <li
                        key={v}
                        className="text-xs font-mono text-slate-500 px-2 py-0.5"
                      >
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 gap-3">
          <div className="flex items-center gap-2">
            {mode === "edit" && template && (
              <>
                <button
                  type="button"
                  onClick={toggleActive}
                  disabled={submitting}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {template.isActive ? "Désactiver" : "Réactiver"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {submitting
                ? "Enregistrement…"
                : mode === "create"
                ? "Créer"
                : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function TemplatesClient() {
  const [filters, setFilters] = useState<Filters>({
    channel: "",
    language: "",
    isActive: "true",
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; template: Template }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.channel) params.set("channel", filters.channel);
      if (filters.language) params.set("language", filters.language);
      if (filters.isActive) params.set("isActive", filters.isActive);

      const res = await fetch(
        `/api/admin/communications/templates?${params.toString()}`
      );
      if (!res.ok) {
        setError("Erreur de chargement");
        setTemplates([]);
        return;
      }
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved() {
    setModal(null);
    load();
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Modèles de message
            </h1>
          </div>
          <p className="text-slate-500 ml-12">
            Templates réutilisables pour SMS, WhatsApp, push et email.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau modèle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Canal
          </label>
          <select
            value={filters.channel}
            onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tous</option>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Langue
          </label>
          <select
            value={filters.language}
            onChange={(e) =>
              setFilters({ ...filters, language: e.target.value })
            }
            className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Toutes</option>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            État
          </label>
          <select
            value={filters.isActive}
            onChange={(e) =>
              setFilters({ ...filters, isActive: e.target.value })
            }
            className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Tous</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      {error ? (
        <p className="text-red-500 text-sm bg-red-50 rounded-xl border border-red-200 p-4">
          {error}
        </p>
      ) : loading && templates.length === 0 ? (
        <p className="text-slate-400 text-sm">Chargement…</p>
      ) : templates.length === 0 ? (
        <p className="text-slate-400 text-sm bg-white rounded-xl border border-slate-200 p-8 text-center">
          Aucun modèle pour ces filtres.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setModal({ mode: "edit", template: t })}
              className={`text-left bg-white rounded-xl border p-5 hover:shadow-sm transition-all ${
                t.isActive
                  ? "border-slate-200 hover:border-slate-300"
                  : "border-slate-200 opacity-60 hover:opacity-80"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-900 line-clamp-2 flex-1">
                  {t.name}
                </p>
                {!t.isActive && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                    inactif
                  </span>
                )}
              </div>
              <p
                className="text-xs font-mono text-slate-500 mb-3 truncate"
                title={t.key}
              >
                {t.key}
              </p>
              <div className="flex items-center gap-2 mb-3">
                <ChannelBadge channel={t.channel} />
                <LanguageBadge language={t.language} />
              </div>
              <p
                className="text-xs text-slate-600 line-clamp-3 leading-relaxed"
                title={t.body}
              >
                {t.body}
              </p>
              {(t.variables ?? []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Variables
                  </p>
                  <p className="text-xs font-mono text-slate-500 line-clamp-1">
                    {(t.variables ?? []).join(", ")}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {modal?.mode === "create" && (
        <TemplateModal
          mode="create"
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.mode === "edit" && (
        <TemplateModal
          mode="edit"
          template={modal.template}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleSaved}
        />
      )}
    </div>
  );
}
