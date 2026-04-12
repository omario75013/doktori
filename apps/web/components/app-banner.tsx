"use client";

import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";

export function AppBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const hidden = localStorage.getItem("doktori-app-banner-dismissed");
    if (!hidden) setDismissed(false);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("doktori-app-banner-dismissed", "1");
  }

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-[#0891B2] to-[#0E7490] text-white px-4 py-2.5 text-center text-sm font-medium sm:text-xs">
      <div className="flex items-center justify-center gap-2">
        <Smartphone className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span>
          Doktori est disponible sur{" "}
          <strong>iOS</strong> et <strong>Android</strong> !
        </span>
        <a
          href="https://apps.apple.com/app/doktori"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-white hover:bg-white/30 transition-colors"
        >
          Télécharger
        </a>
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
