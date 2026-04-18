"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Stethoscope, User, Video, Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const STEPS = [
  {
    icon: User,
    title: "Complétez votre profil",
    description:
      "Ajoutez une photo, votre bio et votre parcours pour rassurer vos patients.",
    cta: "Éditer mon profil",
    href: "/profil/parcours",
  },
  {
    icon: Calendar,
    title: "Configurez vos horaires",
    description:
      "Définissez vos créneaux de disponibilité pour recevoir des réservations.",
    cta: "Configurer l'agenda",
    href: "/agenda",
  },
  {
    icon: Stethoscope,
    title: "Ajoutez vos motifs de consultation",
    description:
      "Créez les types de consultation que vous proposez (durée, tarif).",
    cta: "Ajouter des motifs",
    href: "/motifs",
  },
  {
    icon: Video,
    title: "Activez la téléconsultation",
    description:
      "Consultez vos patients en vidéo depuis n'importe où et recevez vos paiements.",
    cta: "Configurer",
    href: "/teleconsultation",
  },
];

const STORAGE_KEY = "doktori_onboarding_done";

export function DoctorOnboarding() {
  const t = useTranslations("onboarding");
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setVisible(true);
      }
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function goTo(index: number) {
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(index);
  }

  function next() {
    if (stepIndex < STEPS.length - 1) {
      goTo(stepIndex + 1);
    } else {
      dismiss();
    }
  }

  const step = STEPS[stepIndex];
  const Icon = step.icon;
  const isLast = stepIndex === STEPS.length - 1;

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              aria-label={t("closeAriaLabel")}
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            {/* Header gradient */}
            <div className="bg-gradient-to-br from-[#0891B2] to-[#0E7490] px-6 pt-8 pb-6 text-white text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Icon className="h-7 w-7" strokeWidth={1.8} />
                </div>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">
                {t("welcomeBadge")}
              </p>
              <h2 id="onboarding-title" className="text-xl font-black leading-snug">
                {t("setupTitle")}
              </h2>
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-2 pt-5 px-6">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={t("stepAriaLabel", { index: i + 1 })}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === stepIndex
                      ? "w-6 bg-[#0891B2]"
                      : i < stepIndex
                      ? "w-2 bg-[#0891B2]/40"
                      : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Animated step card */}
            <div className="px-6 py-5 overflow-hidden" style={{ minHeight: 160 }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={stepIndex}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0891B2]">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{step.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed pl-11">
                    {step.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            <div className="mx-6 h-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#0891B2] rounded-full"
                animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Actions */}
            <div className="px-6 py-5 space-y-3">
              <Link
                href={step.href}
                onClick={dismiss}
                className="flex items-center justify-center gap-2 w-full bg-[#0891B2] hover:bg-[#0E7490] transition-colors text-white font-bold text-sm py-3 rounded-xl shadow-sm shadow-cyan-200"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                {step.cta}
              </Link>
              <div className="flex items-center justify-between">
                <button
                  onClick={next}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {isLast ? t("finish") : t("skip")}
                </button>
                <span className="text-xs text-slate-300">
                  {stepIndex + 1} / {STEPS.length}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
