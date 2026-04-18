"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Share } from "lucide-react";

const STORAGE_DISMISSED = "doktori_install_dismissed";
const STORAGE_VIEWS = "doktori_pageviews";
const MIN_VIEWS = 3;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (isStandalone()) return;

    // Don't show if dismissed
    if (localStorage.getItem(STORAGE_DISMISSED)) return;

    // Track page views
    const views = Number(localStorage.getItem(STORAGE_VIEWS) || "0") + 1;
    localStorage.setItem(STORAGE_VIEWS, String(views));

    if (views < MIN_VIEWS) return;

    const mobile = isIOS() || isAndroid();
    if (!mobile) return;

    if (isIOS()) {
      setPlatform("ios");
      setShow(true);
    }
    // Android: wait for beforeinstallprompt event
  }, []);

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();

      const dismissed = localStorage.getItem(STORAGE_DISMISSED);
      if (dismissed) return;

      const views = Number(localStorage.getItem(STORAGE_VIEWS) || "0");
      if (views < MIN_VIEWS) return;

      if (isStandalone()) return;

      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setShow(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_DISMISSED, "1");
    setShow(false);
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  if (!show || !platform) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm"
        >
          <div className="rounded-2xl bg-white shadow-xl border border-[#E6F4F1] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0891B2] text-white">
                <Smartphone className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#134E4A]">
                  Installer Doktori sur votre téléphone
                </p>

                {platform === "ios" ? (
                  <p className="text-xs text-[#134E4A]/60 mt-1 leading-relaxed">
                    Appuyez sur{" "}
                    <span className="inline-flex items-center gap-0.5 align-middle">
                      <Share className="h-3.5 w-3.5 text-[#0891B2]" strokeWidth={2.5} />
                    </span>{" "}
                    <strong>Partager</strong>, puis{" "}
                    <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-[#134E4A]/60 mt-1 leading-relaxed">
                    Accédez rapidement à vos rendez-vous depuis votre écran d&apos;accueil.
                  </p>
                )}

                {platform === "android" && (
                  <button
                    onClick={handleAndroidInstall}
                    disabled={installing}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#0891B2] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0E7490] transition-colors disabled:opacity-60"
                  >
                    {installing ? "Installation..." : "Installer l'application"}
                  </button>
                )}
              </div>
              <button
                onClick={dismiss}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
