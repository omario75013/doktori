"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const HIDDEN_PREFIXES = ["/dashboard", "/agenda", "/rendez-vous", "/patients", "/profil", "/secretaires", "/motifs", "/cabinets", "/conventions", "/wallet", "/abonnement", "/domicile", "/cnam", "/stats", "/teleconsult-medecin", "/admin", "/admin-login", "/clinique", "/connexion", "/inscription"];

export function PatientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hide = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  if (hide) return null;
  return <>{children}</>;
}
