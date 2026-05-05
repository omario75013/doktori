"use client";

import { useState, useEffect } from "react";
import { X, Cookie, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "doktori_cookie_consent";
const TOKEN_KEY = "doktori_patient_token";

interface ConsentPrefs {
  analytics: boolean;
  marketing: boolean;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPrefs>({ analytics: false, marketing: false });

  useEffect(() => {
    // Only show if user hasn't consented yet
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  function saveConsent(analytics: boolean, marketing: boolean) {
    const consent = { analytics, marketing, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    setVisible(false);

    // If patient is logged in, persist to DB
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch("/api/me/consents", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          consents: {
            cookies_analytics: analytics,
            cookies_marketing: marketing,
          },
        }),
      }).catch(() => { /* fire and forget */ });
    }
  }

  function acceptAll() {
    saveConsent(true, true);
  }

  function acceptSelected() {
    saveConsent(prefs.analytics, prefs.marketing);
  }

  function rejectAll() {
    saveConsent(false, false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border dark:border-gray-700 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground mb-1">Gestion des cookies</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nous utilisons des cookies pour améliorer votre expérience. Les cookies essentiels sont
                nécessaires au fonctionnement du site.
              </p>

              {/* Expandable preferences */}
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Masquer les détails" : "Personnaliser mes choix"}
              </button>

              {expanded && (
                <div className="mt-3 space-y-2">
                  {/* Essential — always on */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Essentiels</p>
                      <p className="text-xs text-gray-400">Nécessaires au fonctionnement du site</p>
                    </div>
                    <div className="w-10 h-6 bg-primary rounded-full opacity-60 cursor-not-allowed" />
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Analytiques</p>
                      <p className="text-xs text-gray-400">Comprendre comment vous utilisez le site</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.analytics}
                      onClick={() => setPrefs((p) => ({ ...p, analytics: !p.analytics }))}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        prefs.analytics ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white mx-1 transition-transform ${
                          prefs.analytics ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Marketing */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Marketing</p>
                      <p className="text-xs text-gray-400">Publicités personnalisées</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.marketing}
                      onClick={() => setPrefs((p) => ({ ...p, marketing: !p.marketing }))}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        prefs.marketing ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white mx-1 transition-transform ${
                          prefs.marketing ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={rejectAll}
              className="rounded-xl text-xs"
            >
              Refuser tout
            </Button>
            {expanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={acceptSelected}
                className="rounded-xl text-xs border-primary text-primary"
              >
                Enregistrer mes choix
              </Button>
            )}
            <Button
              size="sm"
              onClick={acceptAll}
              className="rounded-xl text-xs bg-primary text-white"
            >
              Tout accepter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
