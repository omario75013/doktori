/**
 * Routes that hide the global public Navbar (used via PatientShell wrapper
 * in app/layout.tsx).
 *
 * Pre-2026-05-06 audit: this list contained 4 prefixes that ALSO appeared
 * (literally or via startsWith) in PUBLIC_PREFIXES in
 * apps/web/components/patient-shell-wrapper.tsx — `/domicile`,
 * `/connexion-patient`, `/teleconsultation`, `/teleconsult-medecin`. Both
 * lists matched the same paths, resulting in NO HEADER AT ALL on those
 * pages (global Navbar hidden + patient header skipped).
 *
 * Fix: remove the 4 overlapping entries from this list. Those routes now
 * show the global public Navbar. If a fully immersive layout is desired
 * (e.g. video-call screens), express that via the route's own layout
 * (e.g. app/(patient)/teleconsultation/[id]/layout.tsx) — not via prefix
 * intersection side-effects.
 */
export const AUTHENTICATED_PREFIXES = [
  "/app-picker",
  "/dashboard",
  "/agenda",
  "/calendrier",
  "/rendez-vous",
  "/patients",
  "/motifs",
  "/cabinets",
  "/conventions",
  "/cnam",
  "/sos-medecin",
  "/stats",
  "/secretaires",
  "/parrainage",
  "/abonnement",
  "/messages",
  "/messagerie",
  "/mes-messages",
  "/wallet",
  "/factures",
  "/profil",
  "/verification",
  "/reseau",
  "/modeles",
  "/admin",
  "/admin-login",
  "/clinique",
  "/clinique-login",
  "/secretaire",
  "/secretaire-login",
  "/connexion",
  "/inscription",
  "/mon-espace",
  "/mes-rdv",
  "/dossier-medical",
] as const;

export function isAuthenticatedRoute(pathname: string): boolean {
  return AUTHENTICATED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const DOCTOR_PREFIX = "/dashboard";
export const ADMIN_PREFIX = "/admin";
export const CLINIC_PREFIX = "/clinique";
export const SECRETARY_PREFIX = "/secretaire";

export type AuthenticatedRole = "doctor" | "admin" | "clinic" | "secretary" | "patient";

export function roleFromPath(pathname: string): AuthenticatedRole | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/clinique")) return "clinic";
  if (pathname.startsWith("/secretaire")) return "secretary";
  if (pathname.startsWith("/mon-espace") || pathname.startsWith("/mes-rdv") || pathname.startsWith("/dossier-medical") || pathname.startsWith("/mes-messages")) return "patient";
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/calendrier") ||
    pathname.startsWith("/rendez-vous") ||
    pathname.startsWith("/patients") ||
    pathname.startsWith("/motifs") ||
    pathname.startsWith("/cabinets") ||
    pathname.startsWith("/conventions") ||
    pathname.startsWith("/cnam") ||
    pathname.startsWith("/domicile") ||
    pathname.startsWith("/sos-medecin") ||
    pathname.startsWith("/stats") ||
    pathname.startsWith("/secretaires") ||
    pathname.startsWith("/parrainage") ||
    pathname.startsWith("/abonnement") ||
    pathname.startsWith("/teleconsultation") ||
    pathname.startsWith("/teleconsult-medecin") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/messagerie") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/factures") ||
    pathname.startsWith("/profil") ||
    pathname.startsWith("/verification") ||
    pathname.startsWith("/reseau") ||
    pathname.startsWith("/modeles")
  ) {
    return "doctor";
  }
  return null;
}
