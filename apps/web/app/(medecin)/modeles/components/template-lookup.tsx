"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, FileText, Loader2, X } from "lucide-react";
import { render } from "@/lib/templates/render";
import type { TemplateContext } from "@/lib/templates/variables";

interface Template {
  id: string;
  title: string;
  description: string | null;
  language: string;
  isOfficial: boolean;
  bodyMarkdown: string;
}

interface Props {
  patientId: string;
  /** Optional — if absent, variables are not resolved (raw {{tokens}} kept). */
  appointmentId?: string;
  /** Filter templates to a specific target_type (prescription, certificat_medical, …). */
  targetType?: string;
  /** Called with rendered plain-text content + the picked template id. */
  onPick: (rendered: string, templateId: string) => void;
}

function buildContext(data: Record<string, unknown>, locale: "fr" | "ar"): TemplateContext {
  const p = (data.patient ?? {}) as Record<string, unknown>;
  const d = (data.doctor ?? {}) as Record<string, unknown>;
  const prac = (d.primaryPractice ?? {}) as Record<string, unknown>;
  const appt = (data.appointment ?? {}) as Record<string, unknown>;
  const mp = (p.medicalProfile ?? {}) as Record<string, unknown>;
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
      startsAt: appt.startsAt ? new Date(appt.startsAt as string) : null,
      type: (appt.type as string | null) ?? null,
    },
    locale,
    now: new Date(),
  };
}

/** Convert HTML to readable plain text with structural line breaks. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/?(h[1-6]|p|div|li|tr)\b[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    .replace(/<\/?(ul|ol|table|tbody|thead)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function TemplateLookup({ patientId, appointmentId, targetType, onPick }: Props) {
  const t = useTranslations("medecin.modeles");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [ctxData, setCtxData] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch templates always; context only when appointmentId is available
  useEffect(() => {
    const qs = targetType ? `?targetType=${encodeURIComponent(targetType)}` : "";
    fetch("/api/medecin/templates" + qs)
      .then((r) => (r.ok ? r.json() : null))
      .then((tpl) => {
        if (Array.isArray(tpl)) setTemplates(tpl as Template[]);
      });
  }, [targetType]);

  useEffect(() => {
    const url = appointmentId
      ? `/api/medecin/patients/${patientId}/template-context?appointmentId=${appointmentId}`
      : `/api/medecin/patients/${patientId}/template-context`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx) => {
        if (ctx) setCtxData(ctx as Record<string, unknown>);
      });
  }, [patientId, appointmentId]);

  // Click-outside closes the dropdown
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const BLANK: Template = {
    id: "__blank__",
    title: t("blankTemplate"),
    description: t("blankTemplateDesc"),
    language: "fr",
    isOfficial: false,
    bodyMarkdown: "",
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = q
      ? templates.filter((tpl) => tpl.title.toLowerCase().includes(q) || (tpl.description?.toLowerCase().includes(q) ?? false))
      : templates;
    // Always prepend the blank "default" template so the doctor can start from scratch.
    return [BLANK, ...matches.slice(0, 12)];
  }, [search, templates, t]);

  function handlePick(template: Template) {
    setApplyingId(template.id);
    try {
      if (template.id === "__blank__") {
        onPick("", "__blank__");
      } else {
        const locale = (template.language as "fr" | "ar") ?? "fr";
        const rendered = ctxData
          ? render(template.bodyMarkdown, buildContext(ctxData, locale)).body
          : template.bodyMarkdown;
        onPick(rendered, template.id);
      }
      setOpen(false);
      setSearch("");
    } finally {
      setApplyingId(null);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hoverIdx]) handlePick(filtered[hoverIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setHoverIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("searchPlaceholder")}
          className="w-full h-9 pl-9 pr-9 rounded-lg border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="clear"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
          {filtered.map((tpl, i) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handlePick(tpl)}
              onMouseEnter={() => setHoverIdx(i)}
              disabled={applyingId !== null}
              className={`w-full flex items-start gap-2 px-3 py-2 text-left border-b border-border last:border-b-0 disabled:opacity-50 ${
                hoverIdx === i ? "bg-primary/5" : "hover:bg-gray-50"
              }`}
            >
              {applyingId === tpl.id ? (
                <Loader2 className="size-4 mt-0.5 animate-spin text-primary" />
              ) : (
                <FileText className="size-4 mt-0.5 text-gray-400" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate text-gray-900">{tpl.title}</span>
                  {tpl.isOfficial && (
                    <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-blue-50 text-blue-600">
                      📌
                    </span>
                  )}
                  <span
                    className={`shrink-0 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                      tpl.language === "ar"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tpl.language.toUpperCase()}
                  </span>
                </div>
                {tpl.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{tpl.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && search && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-border rounded-lg shadow-lg p-3 text-center text-sm text-gray-400">
          {t("noOfficialFiltered")}
        </div>
      )}
    </div>
  );
}
