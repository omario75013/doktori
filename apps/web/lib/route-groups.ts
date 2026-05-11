/**
 * Routes that hide the global public Navbar.
 *
 * Pre-2026-05-07: patient routes (/mon-espace, /mes-rdv, /dossier-medical,
 * /mes-messages) were in this list, hiding the global Navbar in favour of
 * a separate simpler header rendered inside PatientShellWrapper. Result:
 * the patient-side header looked different from the homepage header.
 *
 * Fix: remove patient routes from this list. The global Navbar now serves
 * all spaces, and includes a context-aware <PatientNavMenu /> dropdown
 * that swaps the "Mon compte" link for an avatar+menu when logged in.
 *
 * This list keeps prefixes for doctor/admin/secretary/clinic routes —
 * those have their own dedicated chrome (Sidebar etc) and do NOT want
 * the public Navbar.
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
  "/domicile",
  "/cnam",
  "/sos-medecin",
  "/stats",
  "/secretaires",
  "/parrainage",
  "/abonnement",
  "/messages",
  "/messagerie",
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
  /* Patient surface — uses its own sidebar shell, hide global navbar/footer/chatbot */
  "/mon-espace",
  "/mes-rdv",
  "/dossier-medical",
  "/mes-documents",
  "/mes-notifications",
  "/favoris",
  "/grossesse",
  "/ma-famille",
  "/mon-parrainage",
  "/parametres",
  "/coach-ia",
  "/recherche",
  "/medecin",
  "/rdv",
  "/avis",
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
  if (pathname.startsWith("/mon-espace") || pathname.startsWith("/mes-rdv") || pathname.startsWith("/dossier-medical")) return "patient";
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
