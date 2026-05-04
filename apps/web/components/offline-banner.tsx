"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    // Register service worker (best-effort)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => { /* ignore */ });
    }

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[70] bg-amber-500 text-white px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="h-4 w-4" strokeWidth={2.5} />
      Mode hors ligne — fonctionnalités limitées
    </div>
  );
}
