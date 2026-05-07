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
  /**
   * HTML body of the disclaimer, sourced from the admin-configurable
   * `coach_ia.disclaimer_html` platform_setting and rendered server-side.
   * Falls back to the hardcoded V1 wording when the setting is absent (the
   * page wrapper resolves the default before passing the prop).
   *
   * Trusted: super_admin role is required to write this field via
   * /api/admin/coach-ia/settings.
   */
  disclaimerHtml: string;
}

export function DisclaimerModal({ onAccept, onCancel, disclaimerHtml }: DisclaimerModalProps) {
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

        {/* Admin-curated content (super_admin role required to write).
            We trust the source and render verbatim so wording matches the
            admin preview. Keep the wrapper class list-disc/list-inside so
            <ul>/<li> from the configured HTML pick up the same styling
            as the legacy hardcoded version. */}
        <div
          className="mt-4 text-sm text-gray-700 space-y-3 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:font-bold [&_a]:text-red-600 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: disclaimerHtml }}
        />

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
