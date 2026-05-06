import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { isEnabled } from "@/lib/feature-flags";

// Feature is flag-gated and not yet legally cleared. Keep it out of search
// engines until activation. (See spec docs/superpowers/specs/2026-05-06-coach-ia-design.md)
export const metadata: Metadata = {
  title: "Coach IA — Doktori",
  description:
    "Assistant d'orientation médicale Doktori. Pas un avis médical — pour vous orienter vers la spécialité adaptée.",
  robots: {
    index: false,
    follow: false,
  },
};

// Force dynamic so the feature-flag check runs server-side on every request
// rather than getting baked into a static prerender.
export const dynamic = "force-dynamic";

export default async function CoachIaPage() {
  const enabled = await isEnabled("coach_ia_enabled");

  if (!enabled) {
    // Reachable URL (NOT a 404) so the route exists and can be soft-launched
    // when legal sign-off lands. Wording is deliberately neutral: it does not
    // confirm or deny that "Coach IA" is a real upcoming product.
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Bientôt disponible
          </h1>
          <p className="mt-3 max-w-md text-slate-600">
            Cette fonctionnalité est en préparation. En attendant, vous pouvez
            chercher un médecin par spécialité ou répondre au quiz symptômes
            pour vous orienter.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/recherche"
              className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
            >
              Chercher un médecin
            </Link>
            <Link
              href="/quiz-symptomes"
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Quiz symptômes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // TODO(Phase 2 #9 Tasks 4-5): replace this placeholder with
  //   <DisclaimerModal /> + <CoachIaClient /> once the disclaimer wording
  //   is signed off by counsel and the chat client is implemented.
  // Until then, the flag should remain OFF in prod — the placeholder below
  // is only ever rendered when an operator flips the flag on for staging
  // testing of the wiring. It must NOT be presented as a usable product.
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-lg font-semibold">Coach IA</h1>
        <p className="mt-2 text-sm">
          UI coming after legal review. The chat client and disclaimer modal
          (Tasks 4–5 of the Phase 2 #9 plan) are deferred pending
          legally-validated disclaimer text.
        </p>
      </div>
    </main>
  );
}
