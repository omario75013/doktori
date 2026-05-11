"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isAuthenticatedRoute } from "@/lib/route-groups";

// Public-browsable routes that anonymous users CAN visit. They sit inside the
// (patient) route group so they're flagged as authenticated for layout
// purposes, but if no patient cookie is present we still need to show the
// public-site chrome (Navbar/Footer/Chatbot) so the anonymous user can
// navigate.
const PUBLIC_BROWSABLE = ["/medecin", "/recherche", "/rdv", "/centre-medical"];

export function PatientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);
  const [patientAuth, setPatientAuth] = useState<"loading" | "yes" | "no">("loading");

  const isPublicBrowsable = PUBLIC_BROWSABLE.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  useEffect(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      if (search.get("app") === "desktop") {
        localStorage.setItem("doktori.app", "desktop");
      }
      setIsDesktop(localStorage.getItem("doktori.app") === "desktop");
    } catch {
      /* storage disabled */
    }
  }, [pathname]);

  // For public-browsable patient routes we check the patient cookie to
  // decide whether to keep showing the public-site chrome.
  useEffect(() => {
    if (!isPublicBrowsable) {
      setPatientAuth("no");
      return;
    }
    let cancelled = false;
    fetch("/api/patients/me", { credentials: "include" })
      .then((r) => {
        if (cancelled) return;
        setPatientAuth(r.ok ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setPatientAuth("no");
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, isPublicBrowsable]);

  if (isDesktop) return null;

  // Authenticated-area routes always suppress the public chrome.
  if (isAuthenticatedRoute(pathname)) {
    // Exception: public-browsable routes that the user is browsing anonymously
    // — keep the public chrome so they have a way to navigate.
    if (isPublicBrowsable && patientAuth === "no") {
      return <>{children}</>;
    }
    return null;
  }

  return <>{children}</>;
}
