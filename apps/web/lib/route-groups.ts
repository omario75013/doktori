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
  "/domicile",
  "/sos-medecin",
  "/stats",
  "/secretaires",
  "/parrainage",
  "/abonnement",
  "/teleconsultation",
  "/teleconsult-medecin",
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
  "/connexion-patient",
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
