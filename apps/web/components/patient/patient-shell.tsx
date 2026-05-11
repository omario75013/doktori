"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { OfflineBanner } from "@/components/offline-banner";
import { PatientSidebar } from "@/components/patient/patient-sidebar";
import { PatientTopbar } from "@/components/patient/patient-topbar";

// Routes inside the (patient) group that should render WITHOUT the sidebar
// and topbar regardless of auth state (login / register pages).
const NO_SHELL_PREFIXES = ["/connexion-patient", "/inscription-patient"];

// Public-browsable routes that anonymous users can visit. The patient shell
// should only render here when the user is authenticated; otherwise the page
// shows the public site chrome (global Navbar / Footer).
const PUBLIC_PREFIXES = ["/medecin", "/recherche", "/rdv", "/centre-medical"];

export function PatientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<"loading" | "yes" | "no">("loading");

  const isPublicRoute = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isNoShellRoute = NO_SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  useEffect(() => {
    // Only check auth on routes that need it to decide whether to show the
    // patient chrome (public + authenticated routes can both be visited there).
    if (isNoShellRoute) {
      setAuthState("no");
      return;
    }
    if (!isPublicRoute) {
      // Private patient route — shell always shows (the underlying page
      // will redirect to /connexion-patient if the cookie is missing).
      setAuthState("yes");
      return;
    }
    let cancelled = false;
    fetch("/api/patients/me", { credentials: "include" })
      .then((r) => {
        if (cancelled) return;
        setAuthState(r.ok ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setAuthState("no");
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, isPublicRoute, isNoShellRoute]);

  // Auth pages render as a bare page (no patient chrome, no public chrome).
  if (isNoShellRoute) {
    return <PageTransition>{children}</PageTransition>;
  }

  // Public-browsable pages, anonymous user: still wrap in `.patient-space` so
  // the design tokens (ds-card-patient, ds-page-title, ds-chip, …) used by the page
  // resolve, but skip the sidebar + topbar so the global public Navbar from
  // the root layout shows through above the content.
  if (isPublicRoute && authState !== "yes") {
    return (
      <div className="patient-space">
        <main style={{ padding: "16px 20px 32px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="patient-space">
      <div className="ps-shell">
        <PatientSidebar />
        <div className="ps-main">
          <PatientTopbar />
          <main className="ps-content">
            <div className="ps-content-inner">
              <OfflineBanner />
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
