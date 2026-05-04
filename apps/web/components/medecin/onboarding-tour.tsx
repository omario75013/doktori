"use client";

import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles } from "lucide-react";

type Step = {
  selector: string;
  title: string;
  body: string;
  /** Where to anchor the tooltip relative to the highlighted element. */
  side?: "right" | "left" | "top" | "bottom";
};

const STEPS: Step[] = [
  {
    selector: "[data-tour-id='sidebar']",
    title: "Bienvenue sur Doktori !",
    body:
      "Voici votre menu — accédez à toutes vos fonctionnalités depuis cette barre latérale. Le tour vous présente les sections clés en 5 étapes.",
    side: "right",
  },
  {
    selector: "[data-tour-id='nav-calendrier']",
    title: "Votre calendrier",
    body:
      "Consultez et gérez vos rendez-vous : créneaux disponibles, RDV confirmés, indisponibilités. C'est le cœur de votre journée.",
    side: "right",
  },
  {
    selector: "[data-tour-id='nav-patients']",
    title: "Vos patients",
    body:
      "Consultez le dossier de chaque patient, ajoutez des notes, des ordonnances, ou créez de nouveaux patients en un clic.",
    side: "right",
  },
  {
    selector: "[data-tour-id='nav-modeles']",
    title: "Modèles d'ordonnance",
    body:
      "Gagnez du temps avec des modèles pré-remplis : ordonnances types, certificats, lettres. À adapter en quelques secondes.",
    side: "right",
  },
  {
    selector: "[data-tour-id='nav-stats']",
    title: "Vos statistiques",
    body:
      "Suivez votre activité — nombre de RDV, taux de no-show, revenus — et comparez-vous anonymement à vos pairs de la même spécialité.",
    side: "right",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function readRect(el: Element | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function OnboardingTour({
  enabled,
  initialDelayMs = 1500,
}: {
  enabled: boolean;
  initialDelayMs?: number;
}) {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-launch after delay (only when enabled and not currently active).
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setActive(true), initialDelayMs);
    return () => clearTimeout(t);
  }, [enabled, initialDelayMs]);

  // Recompute target rect on step change + on resize/scroll.
  useLayoutEffect(() => {
    if (!active) return;
    const step = STEPS[stepIdx];
    if (!step) return;

    const compute = () => {
      const el = document.querySelector(step.selector);
      setRect(readRect(el));
    };

    compute();

    const observer = new ResizeObserver(compute);
    document.body && observer.observe(document.body);
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);

    // Tiny re-poll for sidebar nav links that may not yet be mounted on first paint.
    const t = setTimeout(compute, 200);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
      clearTimeout(t);
    };
  }, [active, stepIdx]);

  const close = useCallback(() => {
    setActive(false);
    setStepIdx(0);
    setRect(null);
  }, []);

  const skip = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/medecin/onboarding-tour/skip", { method: "POST" });
    } catch {
      // ignore — best-effort
    }
    setBusy(false);
    close();
  }, [close]);

  const complete = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/medecin/onboarding-tour/complete", { method: "POST" });
    } catch {
      // ignore
    }
    setBusy(false);
    close();
  }, [close]);

  const next = useCallback(() => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      void complete();
    }
  }, [stepIdx, complete]);

  if (!enabled || !active) return null;

  const step = STEPS[stepIdx];
  const last = stepIdx === STEPS.length - 1;

  // Compute tooltip placement next to the highlighted element.
  // Fallback: centered on screen if rect missing.
  const TOOLTIP_W = 320;
  const TOOLTIP_GAP = 12;
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    width: TOOLTIP_W,
    zIndex: 10001,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  };
  if (rect) {
    if (step.side === "right") {
      const left = Math.min(
        rect.left + rect.width + TOOLTIP_GAP,
        window.innerWidth - TOOLTIP_W - 12
      );
      const top = Math.max(12, Math.min(rect.top, window.innerHeight - 220));
      tooltipStyle = { position: "fixed", width: TOOLTIP_W, zIndex: 10001, left, top };
    } else {
      const left = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - TOOLTIP_W - 12)
      );
      const top = Math.min(
        rect.top + rect.height + TOOLTIP_GAP,
        window.innerHeight - 220
      );
      tooltipStyle = { position: "fixed", width: TOOLTIP_W, zIndex: 10001, left, top };
    }
  }

  return (
    <AnimatePresence>
      {/* Dim overlay with a cut-out hole for the highlighted element */}
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10000] pointer-events-none"
        aria-hidden
      >
        {rect ? (
          <svg
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={Math.max(0, rect.left - 6)}
                  y={Math.max(0, rect.top - 6)}
                  width={rect.width + 12}
                  height={rect.height + 12}
                  rx={12}
                  ry={12}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.55)"
              mask="url(#tour-mask)"
            />
            {/* Highlight ring around the cut-out */}
            <rect
              x={Math.max(0, rect.left - 6)}
              y={Math.max(0, rect.top - 6)}
              width={rect.width + 12}
              height={rect.height + 12}
              rx={12}
              ry={12}
              fill="none"
              stroke="#14b8a6"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 bg-slate-900/55" />
        )}
      </motion.div>

      {/* Tooltip card */}
      <motion.div
        key={`tip-${stepIdx}`}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={tooltipStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
        className="rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 pointer-events-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Étape {stepIdx + 1} / {STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            aria-label="Fermer le tour"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3
          id="onboarding-tour-title"
          className="font-bold text-slate-900 text-base"
        >
          {step.title}
        </h3>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Passer
          </button>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIdx
                    ? "w-6 bg-teal-500"
                    : i < stepIdx
                      ? "w-1.5 bg-teal-300"
                      : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60"
          >
            {last ? "Terminer" : "Suivant"}
            {!last && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
