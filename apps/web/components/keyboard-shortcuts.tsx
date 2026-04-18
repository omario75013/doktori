"use client";
import { useEffect } from "react";

export function KeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Escape: close modals
      if (e.key === "Escape") {
        document.dispatchEvent(new CustomEvent("close-modal"));
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return null;
}
