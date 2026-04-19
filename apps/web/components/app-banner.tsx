"use client";

import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";

export function AppBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const hidden = localStorage.getItem("doktori-app-banner-dismissed");
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!hidden && !isStandalone) setDismissed(false);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("doktori-app-banner-dismissed", "1");
  }

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-primary to-doktori-teal-dark text-white px-4 py-2.5 text-center text-sm font-medium sm:text-xs">
      <div className="flex items-center justify-center gap-2">
        <Smartphone className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span>
          L&apos;app Doktori arrive bientôt sur{" "}
          <strong>App Store</strong> et <strong>Google Play</strong>
        </span>
      </div>
      <button
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
