"use client";

import { useEffect } from "react";

const INTERVAL_MS = 60_000; // 60 s

export function DoctorPresencePing() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    function ping() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetch("/api/medecin/presence", { method: "POST", credentials: "include" }).catch(() => { /* ignore */ });
    }

    ping();
    timer = setInterval(ping, INTERVAL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") ping();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
