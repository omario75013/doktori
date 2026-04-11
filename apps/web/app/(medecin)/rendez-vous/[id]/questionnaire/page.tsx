"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Answer {
  id: string;
  questionId: string;
  label: string;
  kind: string;
  displayOrder: number;
  value: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export default function AppointmentQuestionnairePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/appointments/${id}/answers`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(typeof data.error === "string" ? data.error : "Erreur de chargement");
        }
        return res.json() as Promise<Answer[]>;
      })
      .then((data) => {
        setAnswers(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur inattendue");
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/rendez-vous"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0891B2] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux rendez-vous
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-[#0891B2]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#134E4A]">Questionnaire pré-consultation</h1>
          <p className="text-sm text-[#134E4A]/50">Réponses du patient — RDV #{id.slice(0, 8)}</p>
        </div>
      </div>

      {loading && (
        <p className="text-center text-sm text-[#134E4A]/40 py-12">Chargement...</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && answers.length === 0 && (
        <div className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm p-8 text-center">
          <p className="text-sm text-[#134E4A]/50">
            Aucune réponse enregistrée pour ce rendez-vous.
          </p>
        </div>
      )}

      {!loading && answers.length > 0 && (
        <div className="space-y-3">
          {answers.map((answer) => (
            <div
              key={answer.id}
              className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[#0891B2]/70 mb-1">
                {answer.label}
              </div>

              {answer.kind === "file" ? (
                answer.fileUrl ? (
                  <a
                    href={answer.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#0891B2] hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    {answer.value ?? "Fichier joint"}
                  </a>
                ) : (
                  <div className="text-sm text-[#134E4A]/70 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[#134E4A]/30" />
                    <span>{answer.value ?? "—"}</span>
                    <span className="text-xs text-[#134E4A]/40">(fichier non uploadé)</span>
                  </div>
                )
              ) : (
                <div className="text-sm text-[#134E4A] whitespace-pre-wrap">
                  {answer.value && answer.value.trim().length > 0 ? answer.value : (
                    <span className="text-[#134E4A]/30 italic">Non renseigné</span>
                  )}
                </div>
              )}

              <div className="mt-2 text-xs text-[#134E4A]/30">
                {format(parseISO(answer.createdAt), "d MMM yyyy à HH:mm", { locale: fr })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/rendez-vous"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Retour
        </Link>
      </div>
    </div>
  );
}
