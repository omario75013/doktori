"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { X, Search, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { render } from "@/lib/templates/render";
import type { TemplateContext } from "@/lib/templates/variables";
import { LegalDisclaimer } from "./legal-disclaimer";

interface Template {
  id: string;
  title: string;
  description: string | null;
  language: string;
  isOfficial: boolean;
  bodyMarkdown: string;
  applyCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId: string;
  onApply: (markdown: string, templateId: string) => void;
}

function buildContext(data: Record<string, unknown>): TemplateContext {
  const p = (data.patient ?? {}) as Record<string, unknown>;
  const d = (data.doctor ?? {}) as Record<string, unknown>;
  const prac = ((d.primaryPractice ?? {}) as Record<string, unknown>);
  const appt = (data.appointment ?? {}) as Record<string, unknown>;
  const mp = ((p.medicalProfile ?? {}) as Record<string, unknown>);

  return {
    patient: {
      firstName: (p.name as string | null)?.split(" ")[0] ?? null,
      lastName: (p.name as string | null)?.split(" ").slice(1).join(" ") ?? null,
      phone: (p.phone as string | null) ?? null,
      cin: null,
      dateOfBirth: (p.dateOfBirth as string | null) ?? null,
      weightKg: null,
      heightCm: null,
      bloodType: (p.bloodType as string | null) ?? null,
      insuranceProvider: null,
      allergies: (mp.allergies as string[] | null) ?? null,
    },
    doctor: {
      name: (d.name as string | null) ?? null,
      specialty: (d.specialty as string | null) ?? null,
      city: (d.city as string | null) ?? null,
      phone: (d.phone as string | null) ?? null,
      address: null,
      registrationNumber: null,
    },
    practice: {
      address: (prac.address as string | null) ?? null,
      city: (prac.city as string | null) ?? null,
      phone: (prac.phone as string | null) ?? null,
    },
    appointment: {
      startsAt: (appt.startsAt as string | null) ? new Date(appt.startsAt as string) : null,
      type: (appt.type as string | null) ?? null,
    },
    locale: "fr",
    now: new Date(),
  };
}

export function PrescriptionTemplateModal({
  open,
  onClose,
  patientId,
  appointmentId,
  onApply,
}: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [ctx, setCtx] = useState<TemplateContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Template | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [unresolved, setUnresolved] = useState<string[]>([]);

  // Load templates + patient context in parallel when modal opens
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setSelected(null);
    setEditedBody("");
    setSearch("");

    Promise.all([
      fetch("/api/medecin/templates").then((r) => (r.ok ? r.json() : null)),
      fetch(
        `/api/medecin/patients/${patientId}/template-context?appointmentId=${appointmentId}`
      ).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([tplData, ctxData]) => {
        if (Array.isArray(tplData)) {
          setTemplates(tplData as Template[]);
        }
        if (ctxData) {
          setCtx(buildContext(ctxData as Record<string, unknown>));
        }
      })
      .finally(() => setLoading(false));
  }, [open, patientId, appointmentId]);

  // Recompute rendered body when template or context changes
  useEffect(() => {
    if (!selected || !ctx) {
      setUnresolved([]);
      return;
    }
    const result = render(selected.bodyMarkdown, {
      ...ctx,
      locale: (selected.language as "fr" | "ar") ?? "fr",
    });
    setEditedBody(result.body);
    setUnresolved(result.unresolved);
  }, [selected, ctx]);

  const handleApply = useCallback(() => {
    if (!selected) return;
    onApply(editedBody, selected.id);
    onClose();
  }, [selected, editedBody, onApply, onClose]);

  if (!open) return null;

  const filtered = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const officialTemplates = filtered.filter((t) => t.isOfficial);
  const personalTemplates = filtered.filter((t) => !t.isOfficial);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Choisir un modèle d&apos;ordonnance
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-border hover:bg-secondary flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
              <p className="text-sm text-gray-400">Chargement des modèles…</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 divide-x divide-border">
            {/* Left — template list */}
            <div className="w-80 shrink-0 flex flex-col">
              {/* Search */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un modèle…"
                    className="w-full h-8 pl-8 pr-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {officialTemplates.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Modèles officiels
                    </p>
                    {officialTemplates.map((t) => (
                      <TemplateRow
                        key={t.id}
                        template={t}
                        selected={selected?.id === t.id}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                )}

                {personalTemplates.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Mes modèles
                    </p>
                    {personalTemplates.map((t) => (
                      <TemplateRow
                        key={t.id}
                        template={t}
                        selected={selected?.id === t.id}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                )}

                {filtered.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Aucun modèle trouvé
                  </p>
                )}
              </div>
            </div>

            {/* Right — preview + edit */}
            <div className="flex-1 flex flex-col min-w-0">
              {selected ? (
                <>
                  {/* Unresolved warning */}
                  {unresolved.length > 0 && (
                    <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        {unresolved.length} variable{unresolved.length > 1 ? "s" : ""} non
                        résolue{unresolved.length > 1 ? "s" : ""} remplacée
                        {unresolved.length > 1 ? "s" : ""} par{" "}
                        <span className="font-mono font-bold">___</span> :{" "}
                        {unresolved.join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Split: markdown preview + editable textarea */}
                  <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">
                    {/* Preview */}
                    <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-gray-50 p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Aperçu rendu
                      </p>
                      <div
                        dir={selected.language === "ar" ? "rtl" : "ltr"}
                        className="prose prose-sm max-w-none text-gray-800"
                      >
                        <ReactMarkdown>{editedBody}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Editable */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Modifier avant insertion
                      </p>
                      <textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        dir={selected.language === "ar" ? "rtl" : "ltr"}
                        className="flex-1 w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-white text-gray-800 font-mono"
                        rows={8}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4 space-y-3">
                    <LegalDisclaimer />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={onClose}
                        className="h-9 px-4 rounded-xl border border-border text-sm text-gray-600 hover:bg-secondary transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleApply}
                        className="h-9 px-5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Insérer
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-center px-8">
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 text-gray-200 mx-auto" />
                    <p className="text-sm text-gray-400">
                      Sélectionnez un modèle à gauche pour voir l&apos;aperçu
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: (t: Template) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
        selected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-secondary border border-transparent"
      }`}
    >
      <p className="text-sm font-medium text-gray-800 truncate">{template.title}</p>
      {template.description && (
        <p className="text-xs text-gray-400 truncate mt-0.5">{template.description}</p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-300">
          {template.language === "ar" ? "عربي" : "Français"}
        </span>
        {template.applyCount > 0 && (
          <span className="text-xs text-gray-300">· {template.applyCount} utilisations</span>
        )}
      </div>
    </button>
  );
}
