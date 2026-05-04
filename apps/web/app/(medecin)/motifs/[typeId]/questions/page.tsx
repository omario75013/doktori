"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

type QuestionKind = "text" | "choice" | "file" | "yesno";

interface Question {
  id: string;
  appointmentTypeId: string;
  label: string;
  kind: QuestionKind;
  choices: string[] | null;
  required: boolean;
  displayOrder: number;
  createdAt: string;
}

const KIND_LABELS: Record<QuestionKind, string> = {
  text: "Texte libre",
  choice: "Choix multiple",
  file: "Fichier / Document",
  yesno: "Oui / Non",
};

export default function QuestionsPage({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId } = use(params);
  const t = useTranslations("medecin.questions");
  const tCommon = useTranslations("medecin.common");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<QuestionKind>("text");
  const [choicesRaw, setChoicesRaw] = useState("");
  const [required, setRequired] = useState(false);

  async function refresh() {
    setError(null);
    const res = await fetch(`/api/appointment-types/${typeId}/questions`);
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as Question[];
    setQuestions(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const choices =
      kind === "choice"
        ? choicesRaw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const res = await fetch(`/api/appointment-types/${typeId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        kind,
        choices,
        required,
        displayOrder: questions.length,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : t("creationError"));
      setSaving(false);
      return;
    }

    setLabel("");
    setKind("text");
    setChoicesRaw("");
    setRequired(false);
    await refresh();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/appointment-types/${typeId}/questions/${id}`, {
      method: "DELETE",
    });
    if (res.ok) await refresh();
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const newOrder = direction === "up" ? idx - 1 : idx + 1;
    if (newOrder < 0 || newOrder >= questions.length) return;

    const target = questions[newOrder];
    await Promise.all([
      fetch(`/api/appointment-types/${typeId}/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: target.displayOrder }),
      }),
      fetch(`/api/appointment-types/${typeId}/questions/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: questions[idx].displayOrder }),
      }),
    ]);
    await refresh();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/motifs"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToMotifs")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">{t("pageTitle")}</h1>
      <p className="text-sm text-foreground/60 mb-6">
        {t("pageSubtitle")}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          {t("addQuestion")}
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <Label htmlFor="label">{t("questionLabel")}</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("questionPlaceholder")}
              required
              maxLength={500}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kind">{t("responseType")}</Label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as QuestionKind)}
                className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(KIND_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                {t("requiredLabel")}
              </label>
            </div>
          </div>

          {kind === "choice" && (
            <div>
              <Label htmlFor="choices">
                {t("optionsLabel")}
              </Label>
              <textarea
                id="choices"
                value={choicesRaw}
                onChange={(e) => setChoicesRaw(e.target.value)}
                placeholder={"Option A\nOption B\nOption C"}
                rows={4}
                className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>
          )}

          {kind === "file" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {t("fileNote")}
            </div>
          )}

          <Button type="submit" disabled={saving} className="bg-primary hover:bg-doktori-teal-dark">
            {saving ? t("adding") : t("addBtn")}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {t("countLabel", { count: loading ? "…" : questions.length })}
          </h2>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-foreground/40">{t("loading")}</p>
        ) : questions.length === 0 ? (
          <p className="p-6 text-center text-sm text-foreground/40">
            {t("noQuestions")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {questions.map((q, idx) => (
              <li key={q.id} className="p-4 flex items-start gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleReorder(q.id, "up")}
                    disabled={idx === 0}
                    className="rounded p-0.5 hover:bg-secondary disabled:opacity-20 text-primary"
                    title="Monter"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(q.id, "down")}
                    disabled={idx === questions.length - 1}
                    className="rounded p-0.5 hover:bg-secondary disabled:opacity-20 text-primary"
                    title="Descendre"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground text-sm">{q.label}</div>
                  <div className="text-xs text-foreground/50 mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-secondary border border-border px-2 py-0.5">
                      {KIND_LABELS[q.kind]}
                    </span>
                    {q.required && (
                      <span className="rounded-full bg-red-50 border border-red-100 text-red-600 px-2 py-0.5">
                        {t("requiredLabel")}
                      </span>
                    )}
                  </div>
                  {q.kind === "choice" && q.choices && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {q.choices.map((c, i) => (
                        <span
                          key={i}
                          className="text-xs rounded bg-secondary border border-border px-1.5 py-0.5 text-primary"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(q.id)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors flex-shrink-0"
                  title={tCommon("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
