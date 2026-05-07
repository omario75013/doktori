"use client";

/**
 * Patient shell — mobile bottom-nav only.
 *
 * Pre-2026-05-07: this wrapper rendered its own simplified top header that
 * conflicted with the global Navbar — leading to two different headers
 * across the app (homepage vs /mon-espace). Header removed; the global
 * Navbar now serves all routes, and `<PatientNavMenu />` (rendered inside
 * Navbar) handles the avatar + dropdown when the patient is logged in.
 */

import { PatientBottomNav } from "@/components/patient-bottom-nav";

export function PatientShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <div className="flex-1">{children}</div>
      <PatientBottomNav />
    </div>
  );
}
