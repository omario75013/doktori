"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  Sparkles,
} from "lucide-react";

type BodyPart =
  | "tete"
  | "yeux"
  | "gorge"
  | "poitrine"
  | "estomac"
  | "dos"
  | "articulations"
  | "peau"
  | "autre";

type Duration = "today" | "week" | "more";

type Symptom =
  | "fievre"
  | "douleur"
  | "eruption"
  | "saignement"
  | "vertige"
  | "nausee"
  | "fatigue"
  | "autre";

const BODY_PARTS: { id: BodyPart; label: string; emoji: string }[] = [
  { id: "tete", label: "Tête", emoji: "🤕" },
  { id: "yeux", label: "Yeux", emoji: "👁️" },
  { id: "gorge", label: "Gorge", emoji: "🗣️" },
  { id: "poitrine", label: "Poitrine", emoji: "🫁" },
  { id: "estomac", label: "Estomac", emoji: "🤢" },
  { id: "dos", label: "Dos", emoji: "🦴" },
  { id: "articulations", label: "Articulations", emoji: "🦵" },
  { id: "peau", label: "Peau", emoji: "✋" },
  { id: "autre", label: "Autre", emoji: "❓" },
];

const SYMPTOMS: { id: Symptom; label: string }[] = [
  { id: "fievre", label: "Fièvre" },
  { id: "douleur", label: "Douleur intense" },
  { id: "eruption", label: "Éruption cutanée" },
  { id: "saignement", label: "Saignement" },
  { id: "vertige", label: "Vertige" },
  { id: "nausee", label: "Nausée" },
  { id: "fatigue", label: "Fatigue" },
  { id: "autre", label: "Autre" },
];

function recommendSpecialty(
  body: BodyPart,
  _duration: Duration,
  symptoms: Symptom[]
): { id: string; label: string; reason: string } {
  // Priority rules
  if (symptoms.includes("eruption") || (body === "peau" && symptoms.length > 0)) {
    return { id: "dermatologue", label: "Dermatologue", reason: "Symptômes cutanés" };
  }
  if (body === "yeux") {
    return { id: "ophtalmologue", label: "Ophtalmologue", reason: "Atteinte oculaire" };
  }
  if (body === "articulations" || body === "dos") {
    return {
      id: "rhumatologue",
      label: "Rhumatologue ou Médecin Généraliste",
      reason: "Douleurs articulaires/dorsales",
    };
  }
  if (body === "gorge") {
    return { id: "orl", label: "ORL ou Médecin Généraliste", reason: "Symptômes ORL" };
  }
  if (body === "poitrine" && (symptoms.includes("douleur") || symptoms.includes("vertige"))) {
    return {
      id: "cardiologue",
      label: "Cardiologue (urgent si douleur intense)",
      reason: "Symptômes thoraciques",
    };
  }
  if (body === "estomac") {
    return {
      id: "gastro-enterologue",
      label: "Gastro-entérologue ou Médecin Généraliste",
      reason: "Symptômes digestifs",
    };
  }
  return {
    id: "medecine-generale",
    label: "Médecin Généraliste",
    reason: "Premier diagnostic recommandé",
  };
}

export default function QuizSymptomesPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [body, setBody] = useState<BodyPart | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);

  const reset = () => {
    setStep(1);
    setBody(null);
    setDuration(null);
    setSymptoms([]);
  };

  const recommendation = body && duration ? recommendSpecialty(body, duration, symptoms) : null;

  return (
    <div className="min-h-screen bg-secondary px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" strokeWidth={2} />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Quel médecin consulter ?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Répondez à 3 questions pour obtenir une orientation.
          </p>
        </header>

        {/* Progress bar */}
        {step < 4 && (
          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition ${
                  n <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {step === 1 && (
            <>
              <h2 className="mb-1 font-heading text-lg font-bold text-foreground">
                Où avez-vous mal ?
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">Sélectionnez la zone principale.</p>
              <div className="grid grid-cols-3 gap-3">
                {BODY_PARTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setBody(p.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 transition ${
                      body === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>
                      {p.emoji}
                    </span>
                    <span className="text-xs font-bold text-foreground">{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!body}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-doktori-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuer <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-1 font-heading text-lg font-bold text-foreground">
                Depuis combien de temps ?
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Cela aide à évaluer l&apos;urgence.
              </p>
              <div className="space-y-2">
                {(
                  [
                    { id: "today", label: "Aujourd'hui", desc: "Apparu dans les dernières 24 h" },
                    { id: "week", label: "Cette semaine", desc: "Depuis 2 à 7 jours" },
                    { id: "more", label: "Plus d'une semaine", desc: "Symptômes prolongés" },
                  ] as const
                ).map((d) => (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition ${
                      duration === d.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-foreground">{d.label}</div>
                      <div className="text-xs text-muted-foreground">{d.desc}</div>
                    </div>
                    <input
                      type="radio"
                      name="duration"
                      checked={duration === d.id}
                      onChange={() => setDuration(d.id)}
                      className="h-4 w-4 accent-primary"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  type="button"
                  disabled={!duration}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-doktori-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuer <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="mb-1 font-heading text-lg font-bold text-foreground">
                Quels symptômes avez-vous ?
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Cochez tout ce qui s&apos;applique (optionnel).
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SYMPTOMS.map((s) => {
                  const checked = symptoms.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition ${
                        checked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-foreground hover:border-primary/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSymptoms((prev) => [...prev, s.id]);
                          else setSymptoms((prev) => prev.filter((x) => x !== s.id));
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      {s.label}
                    </label>
                  );
                })}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-doktori-teal-dark"
                >
                  Voir le résultat <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </>
          )}

          {step === 4 && recommendation && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Stethoscope className="h-8 w-8 text-primary" strokeWidth={2} />
              </div>
              <p className="text-sm text-muted-foreground">Nous vous recommandons de consulter un</p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-primary sm:text-3xl">
                {recommendation.label}
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">{recommendation.reason}</p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link
                  href={`/recherche?specialty=${encodeURIComponent(recommendation.id)}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-doktori-teal-dark"
                >
                  Voir les médecins disponibles
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center justify-center rounded-full border border-border bg-white px-6 py-3 text-sm font-medium text-foreground hover:border-primary"
                >
                  Recommencer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mandatory disclaimer */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <div className="text-xs leading-relaxed text-red-900">
            <p className="font-bold">
              Outil d&apos;orientation, ne remplace pas une consultation médicale.
            </p>
            <p className="mt-1">
              <strong>Urgence vitale</strong> : composez le <strong>190</strong> (SAMU) ou le{" "}
              <strong>198</strong> (Protection civile).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
