"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";

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

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<QuestionKind>("text");
  const [choicesRaw, setChoicesRaw] = useState("");
  const [required, setRequired] = useState(false);

  async function refresh() {
    setError(null);
    const res = await fetch(`/api/appointment-types/${typeId}/questions`);
    if (!res.ok) {
      setError("Impossible de charger les questions");
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
      setError(typeof data.error === "string" ? data.error : "Erreur lors de la création");
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
    // Swap display orders
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
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0891B2] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux motifs
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[#134E4A] mb-1">Questionnaire pré-consultation</h1>
      <p className="text-sm text-[#134E4A]/60 mb-6">
        Ces questions seront posées au patient lors de la prise de rendez-vous pour ce motif.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add question form */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-[#134E4A] mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#0891B2]" />
          Ajouter une question
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <Label htmlFor="label">Question</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Avez-vous des antécédents cardiaques ?"
              required
              maxLength={500}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="kind">Type de réponse</Label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as QuestionKind)}
                className="mt-1 w-full rounded-md border border-[#E6F4F1] bg-white px-3 py-2 text-sm text-[#134E4A] focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              >
                {Object.entries(KIND_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-[#134E4A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-[#E6F4F1] text-[#0891B2] focus:ring-[#0891B2]"
                />
                Obligatoire
              </label>
            </div>
          </div>

          {kind === "choice" && (
            <div>
              <Label htmlFor="choices">
                Options (une par ligne, minimum 2)
              </Label>
              <textarea
                id="choices"
                value={choicesRaw}
                onChange={(e) => setChoicesRaw(e.target.value)}
                placeholder={"Option A\nOption B\nOption C"}
                rows={4}
                className="mt-1 w-full rounded-md border border-[#E6F4F1] bg-white px-3 py-2 text-sm text-[#134E4A] focus:outline-none focus:ring-2 focus:ring-[#0891B2] resize-none"
                required
              />
            </div>
          )}

          {kind === "file" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Note : le téléchargement de fichiers sera disponible dans une prochaine version. Pour l&apos;instant le nom du fichier est enregistré.
            </div>
          )}

          <Button type="submit" disabled={saving} className="bg-[#0891B2] hover:bg-[#0E7490]">
            {saving ? "Ajout..." : "Ajouter la question"}
          </Button>
        </form>
      </div>

      {/* Questions list */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm">
        <div className="p-4 border-b border-[#E6F4F1]">
          <h2 className="font-semibold text-[#134E4A]">
            Questions ({loading ? "…" : questions.length})
          </h2>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-[#134E4A]/40">Chargement...</p>
        ) : questions.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#134E4A]/40">
            Aucune question — ajoutez-en une ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-[#E6F4F1]">
            {questions.map((q, idx) => (
              <li key={q.id} className="p-4 flex items-start gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleReorder(q.id, "up")}
                    disabled={idx === 0}
                    className="rounded p-0.5 hover:bg-[#F0FDFA] disabled:opacity-20 text-[#0891B2]"
                    title="Monter"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(q.id, "down")}
                    disabled={idx === questions.length - 1}
                    className="rounded p-0.5 hover:bg-[#F0FDFA] disabled:opacity-20 text-[#0891B2]"
                    title="Descendre"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#134E4A] text-sm">{q.label}</div>
                  <div className="text-xs text-[#134E4A]/50 mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-[#F0FDFA] border border-[#E6F4F1] px-2 py-0.5">
                      {KIND_LABELS[q.kind]}
                    </span>
                    {q.required && (
                      <span className="rounded-full bg-red-50 border border-red-100 text-red-600 px-2 py-0.5">
                        Obligatoire
                      </span>
                    )}
                  </div>
                  {q.kind === "choice" && q.choices && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {q.choices.map((c, i) => (
                        <span
                          key={i}
                          className="text-xs rounded bg-[#F0FDFA] border border-[#E6F4F1] px-1.5 py-0.5 text-[#0891B2]"
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
                  title="Supprimer"
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
