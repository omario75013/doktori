"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sparkles, Bell, User, Search, ChevronRight, X, Check } from "lucide-react";

const STORAGE_KEY = "doktori_onboarded";
const TOKEN_KEY = "doktori_patient_token";

const STEPS = [
  {
    icon: Sparkles,
    title: "Bienvenue sur Doktori",
    body: "Voici les principales fonctionnalités : recherche de médecins, prise de rendez-vous en ligne, dossier médical, téléconsultation et SOS.",
    cta: "Continuer",
  },
  {
    icon: Bell,
    title: "Activer les notifications",
    body: "Recevez des rappels avant vos rendez-vous et des alertes en cas de changement.",
    cta: "Activer",
  },
  {
    icon: User,
    title: "Compléter votre profil",
    body: "Renseignez votre date de naissance, groupe sanguin et coordonnées d'urgence pour gagner du temps.",
    cta: "Compléter",
  },
  {
    icon: Search,
    title: "Lancer une recherche",
    body: "Trouvez le médecin idéal selon votre spécialité et votre ville.",
    cta: "Rechercher",
  },
] as const;

export function OnboardingModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const onboarded = localStorage.getItem(STORAGE_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (!onboarded && token) {
        // Defer to next tick to avoid SSR hydration warning
        const t = setTimeout(() => setOpen(true), 400);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch { /* ignore */ }
    setOpen(false);
  }

  async function handleStepAction() {
    const current = step;
    if (current === 1) {
      // Activate notifications
      try {
        if (typeof Notification !== "undefined") {
          await Notification.requestPermission();
        }
      } catch { /* ignore */ }
    } else if (current === 2) {
      finish();
      router.push("/mon-espace");
      return;
    } else if (current === 3) {
      finish();
      router.push("/recherche");
      return;
    }
    if (current < STEPS.length - 1) {
      setStep(current + 1);
    } else {
      finish();
    }
  }

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary to-foreground px-6 py-8 text-white">
          <button
            type="button"
            onClick={finish}
            aria-label="Fermer"
            className="absolute top-3 right-3 rounded-full p-1.5 hover:bg-white/20 text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="h-7 w-7" strokeWidth={2} />
          </div>
          <h2 className="mt-4 text-xl font-black">{current.title}</h2>
          <p className="mt-2 text-sm text-white/90 leading-relaxed">{current.body}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-gray-200"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleStepAction}
            className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {step === STEPS.length - 1 ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {current.cta}
          </button>
          <button
            type="button"
            onClick={finish}
            className="w-full h-10 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Passer
          </button>
        </div>
      </div>
    </div>
  );
}
