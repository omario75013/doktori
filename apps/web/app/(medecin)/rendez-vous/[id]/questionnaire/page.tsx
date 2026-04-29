"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("medecin.questionnaire");
  const tCommon = useTranslations("medecin.common");
  const { id } = use(params);

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/appointments/${id}/answers`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(typeof data.error === "string" ? data.error : tCommon("error"));
        }
        return res.json() as Promise<Answer[]>;
      })
      .then((data) => {
        setAnswers(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : tCommon("error"));
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/rendez-vous"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToAppointments")}
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("pageTitle")}</h1>
          <p className="text-sm text-foreground/50">{t("patientResponses", { id: id.slice(0, 8) })}</p>
        </div>
      </div>

      {loading && (
        <p className="text-center text-sm text-foreground/40 py-12">{t("loading")}</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && answers.length === 0 && (
        <div className="rounded-2xl border border-border bg-white shadow-sm p-8 text-center">
          <p className="text-sm text-foreground/50">
            {t("noResponses")}
          </p>
        </div>
      )}

      {!loading && answers.length > 0 && (
        <div className="space-y-3">
          {answers.map((answer) => (
            <div
              key={answer.id}
              className="rounded-2xl border border-border bg-white shadow-sm p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-primary/70 mb-1">
                {answer.label}
              </div>

              {answer.kind === "file" ? (
                answer.fileUrl ? (
                  <a
                    href={answer.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    {answer.value ?? t("attachedFile")}
                  </a>
                ) : (
                  <div className="text-sm text-foreground/70 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-foreground/30" />
                    <span>{answer.value ?? "—"}</span>
                    <span className="text-xs text-foreground/40">{t("fileNotUploaded")}</span>
                  </div>
                )
              ) : (
                <div className="text-sm text-foreground whitespace-pre-wrap">
                  {answer.value && answer.value.trim().length > 0 ? answer.value : (
                    <span className="text-foreground/30 italic">{t("notProvided")}</span>
                  )}
                </div>
              )}

              <div className="mt-2 text-xs text-foreground/30">
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
          {tCommon("back")}
        </Link>
      </div>
    </div>
  );
}
