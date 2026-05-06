/**
 * Coach IA disclaimer modal.
 *
 * IMPORTANT: This text is a V1 DRAFT. It must be reviewed by Omar / legal
 * counsel BEFORE the `coach_ia_enabled` feature flag is flipped to true in
 * production. Easy to edit later — text only changes don't affect logic.
 *
 * The "Je comprends" click POSTs to /api/coach-ia/disclaimer-accepted which
 * logs the consent event in coach_ia_usage with no PII content.
 */
"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface DisclaimerModalProps {
  onAccept: () => void;
  onCancel: () => void;
}

export function DisclaimerModal({ onAccept, onCancel }: DisclaimerModalProps) {
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch("/api/coach-ia/disclaimer-accepted", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to log acceptance");
      onAccept();
    } catch (e) {
      // Don't block UX on logging failure — proceed anyway.
      console.warn("[coach-ia] disclaimer log failed:", e);
      onAccept();
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-ia-disclaimer-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2
            id="coach-ia-disclaimer-title"
            className="text-lg font-semibold text-foreground pt-1"
          >
            Coach IA — assistant d&apos;orientation médicale
          </h2>
        </div>

        <div className="mt-4 text-sm text-gray-700 space-y-3">
          <p className="font-medium text-gray-900">
            Avant de continuer, lisez attentivement :
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              Cet assistant <strong>n&apos;est pas un médecin</strong> et ne
              pose <strong>aucun diagnostic</strong>.
            </li>
            <li>
              Il vous aide uniquement à identifier la spécialité médicale
              appropriée pour vos symptômes — et à prendre rendez-vous sur
              Doktori.
            </li>
            <li>
              Il <strong>ne prescrit pas</strong> de médicaments. Consultez un
              pharmacien ou votre médecin pour toute question de traitement.
            </li>
            <li>
              <strong className="text-red-600">En cas d&apos;urgence</strong>{" "}
              (douleur thoracique, difficultés respiratoires, saignement,
              pensées suicidaires, perte de connaissance, traumatisme), appelez
              le SAMU au{" "}
              <a
                href="tel:190"
                className="font-bold text-red-600 underline"
              >
                190
              </a>{" "}
              ou les pompiers au{" "}
              <a
                href="tel:198"
                className="font-bold text-red-600 underline"
              >
                198
              </a>{" "}
              — n&apos;utilisez pas ce chat.
            </li>
            <li>
              Vos messages <strong>ne sont pas conservés</strong>. Chaque
              session est indépendante.
            </li>
            <li>Limite : 10 messages par 24 heures.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={accepting}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting}
            className="rounded-xl bg-foreground text-white px-4 py-2 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50"
          >
            {accepting ? "Validation…" : "Je comprends et j'accepte"}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Cliquer sur «&nbsp;Je comprends&nbsp;» constitue votre consentement
          explicite (RGPD Art. 9(2)(a)).
        </p>
      </div>
    </div>
  );
}
