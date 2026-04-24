"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isAuthenticatedRoute } from "@/lib/route-groups";

export function PatientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);

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

  if (isAuthenticatedRoute(pathname)) return null;
  if (isDesktop) return null;
  return <>{children}</>;
}
