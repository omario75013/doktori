"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { render, type RenderResult } from "@/lib/templates/render";
import type { TemplateContext } from "@/lib/templates/variables";

interface Props {
  body: string;
  language: "fr" | "ar";
}

export function TemplatePreview({ body, language }: Props) {
  const [ctx, setCtx] = useState<TemplateContext | null>(null);
  const [result, setResult] = useState<RenderResult | null>(null);

  useEffect(() => {
    fetch("/api/medecin/template-context/preview")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        // Build TemplateContext from API response
        const p = data.patient ?? {};
        const d = data.doctor ?? {};
        const prac = d.primaryPractice ?? {};
        const appt = data.appointment ?? {};

        const context: TemplateContext = {
          patient: {
            firstName: p.name?.split(" ")[0] ?? null,
            lastName: p.name?.split(" ").slice(1).join(" ") ?? null,
            phone: p.phone ?? null,
            cin: p.cin ?? null,
            dateOfBirth: p.dateOfBirth ?? null,
            weightKg: p.weightKg ?? null,
            heightCm: p.heightCm ?? null,
            bloodType: p.bloodType ?? null,
            insuranceProvider: p.insuranceProvider ?? null,
            allergies: p.medicalProfile?.allergies ?? null,
          },
          doctor: {
            name: d.name ?? null,
            specialty: d.specialty ?? null,
            city: d.city ?? null,
            phone: d.phone ?? null,
            address: d.address ?? null,
            registrationNumber: d.registrationNumber ?? null,
          },
          practice: {
            address: prac.address ?? null,
            city: prac.city ?? null,
            phone: prac.phone ?? null,
          },
          appointment: {
            startsAt: appt.startsAt ? new Date(appt.startsAt) : null,
            type: appt.type ?? null,
          },
          locale: language,
          now: new Date(),
        };
        setCtx(context);
      });
  }, [language]);

  useEffect(() => {
    if (!ctx) return;
    const updated: TemplateContext = { ...ctx, locale: language };
    setResult(render(body, updated));
  }, [body, ctx, language]);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">
          Aperçu (patient fictif: Sami Trabelsi, 35 ans)
        </h3>
      </div>
      <div className="p-4 min-h-[120px]">
        {!result ? (
          <p className="text-xs text-gray-400 italic">Chargement de l'aperçu…</p>
        ) : (
          <>
            {result.unresolved.length > 0 && (
              <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ⚠ {result.unresolved.length} variable
                {result.unresolved.length > 1 ? "s" : ""} non résolue
                {result.unresolved.length > 1 ? "s" : ""} :{" "}
                {result.unresolved.join(", ")}
              </div>
            )}
            <div
              dir={language === "ar" ? "rtl" : "ltr"}
              className="prose prose-sm max-w-none text-gray-800"
            >
              <ReactMarkdown>{result.body}</ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
