"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { roleFromPath } from "@/lib/route-groups";

/**
 * Small persistent bar visible only inside the Tauri desktop app.
 * Gives the user a one-click way back to the role picker from any page
 * (including the public login pages where there's no avatar menu).
 */
export function DesktopBackBar() {
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

  if (!isDesktop) return null;
  // Don't show on the picker itself
  if (pathname.startsWith("/app-picker")) return null;
  // Hide on authenticated dashboards — the profile menu already has a role-change option
  if (roleFromPath(pathname)) return null;

  return (
    <div className="sticky top-0 z-[45] bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-3 py-1.5 flex items-center justify-between text-xs">
        <Link
          href="/app-picker?picker=1"
          onClick={() => {
            try {
              localStorage.removeItem("doktori.role");
            } catch {
              /* ignore */
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/10 font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Changer de rôle
        </Link>
        <span className="hidden sm:inline text-slate-400">Doktori Desktop</span>
      </div>
    </div>
  );
}
