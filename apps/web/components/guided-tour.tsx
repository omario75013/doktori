"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  steps: TourStep[];
  storageKey: string;
  onComplete?: () => void;
}

export function GuidedTour({ steps, storageKey, onComplete }: GuidedTourProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(storageKey);
    if (!done) {
      // Delay to let the page render
      const t = setTimeout(() => setActive(true), 1500);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const highlightTarget = useCallback(() => {
    if (!active || stepIndex >= steps.length) return;
    const el = document.querySelector(steps[stepIndex].target) as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Save original styles before modifying so cleanup can restore exactly
      const origStyles = {
        position: el.style.position,
        zIndex: el.style.zIndex,
        boxShadow: el.style.boxShadow,
        borderRadius: el.style.borderRadius,
        transition: el.style.transition,
      };
      // Add highlight ring
      el.style.position = "relative";
      el.style.zIndex = "60";
      el.style.boxShadow = "0 0 0 4px rgba(8, 145, 178, 0.4), 0 0 20px rgba(8, 145, 178, 0.15)";
      el.style.borderRadius = "12px";
      el.style.transition = "box-shadow 0.3s ease";
      return () => {
        // Restore ALL original properties
        el.style.position = origStyles.position;
        el.style.zIndex = origStyles.zIndex;
        el.style.boxShadow = origStyles.boxShadow;
        el.style.borderRadius = origStyles.borderRadius;
        el.style.transition = origStyles.transition;
      };
    } else {
      setRect(null);
    }
  }, [active, stepIndex, steps]);

  useEffect(() => {
    const cleanup = highlightTarget();
    // Recompute bounding rect on scroll/resize
    const handler = () => {
      const el = document.querySelector(steps[stepIndex]?.target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      // Restore element styles and remove listeners
      cleanup?.();
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [highlightTarget, steps, stepIndex]);

  // Cleanup all modified elements on component unmount
  useEffect(() => {
    return () => {
      steps.forEach((step) => {
        const el = document.querySelector(step.target) as HTMLElement | null;
        if (el) {
          el.style.position = "";
          el.style.zIndex = "";
          el.style.boxShadow = "";
          el.style.borderRadius = "";
          el.style.transition = "";
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearHighlight(selector?: string) {
    if (!selector) return;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      el.style.position = "";
      el.style.zIndex = "";
      el.style.boxShadow = "";
      el.style.borderRadius = "";
      el.style.transition = "";
    }
  }

  function dismiss() {
    clearHighlight(steps[stepIndex]?.target);
    localStorage.setItem(storageKey, "1");
    setActive(false);
    onComplete?.();
  }

  function next() {
    clearHighlight(steps[stepIndex]?.target);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    clearHighlight(steps[stepIndex]?.target);
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  }

  if (!active || stepIndex >= steps.length) return null;

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Position the tooltip
  const pos = step.position || "bottom";
  let tooltipStyle: React.CSSProperties = {};
  if (rect) {
    const pad = 16;
    if (pos === "bottom") {
      tooltipStyle = { top: rect.bottom + pad, left: rect.left, maxWidth: 360 };
    } else if (pos === "top") {
      tooltipStyle = { bottom: window.innerHeight - rect.top + pad, left: rect.left, maxWidth: 360 };
    } else if (pos === "right") {
      tooltipStyle = { top: rect.top, left: rect.right + pad, maxWidth: 320 };
    } else if (pos === "left") {
      tooltipStyle = { top: rect.top, right: window.innerWidth - rect.left + pad, maxWidth: 320 };
    }
    // Keep on screen
    if (tooltipStyle.left && typeof tooltipStyle.left === "number" && tooltipStyle.left > window.innerWidth - 380) {
      tooltipStyle.left = window.innerWidth - 380;
    }
    if (tooltipStyle.left && typeof tooltipStyle.left === "number" && tooltipStyle.left < 16) {
      tooltipStyle.left = 16;
    }
  }

  return (
    <>
      {/* Overlay — click-through except on the tooltip */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/30 transition-opacity"
        onClick={(e) => {
          if (e.target === overlayRef.current) dismiss();
        }}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[60] bg-white rounded-2xl shadow-2xl border border-border overflow-hidden"
          style={tooltipStyle}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-doktori-teal-dark px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Guide · Étape {stepIndex + 1}/{steps.length}
              </span>
            </div>
            <button
              onClick={dismiss}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Fermer le guide"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            <h3 className="font-bold text-foreground text-base mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
          </div>

          {/* Progress + navigation */}
          <div className="px-5 pb-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? "w-5 bg-primary" : i < stepIndex ? "w-1.5 bg-primary/40" : "w-1.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Retour
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1 bg-primary hover:bg-doktori-teal-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {isLast ? "Terminer" : "Suivant"}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
