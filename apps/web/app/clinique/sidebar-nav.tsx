"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Calendar,
  Users,
  UserRound,
  UserCog,
  BarChart3,
  StickyNote,
  Printer,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";

const LINKS = [
  { href: "/clinique/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clinique/agenda", label: "Agenda équipe", icon: CalendarDays },
  { href: "/clinique/planning", label: "Planning", icon: CalendarRange },
  { href: "/clinique/rendez-vous", label: "Rendez-vous", icon: Calendar },
  { href: "/clinique/medecins", label: "Médecins", icon: Users },
  { href: "/clinique/patients", label: "Patients", icon: UserRound },
  { href: "/clinique/secretaires", label: "Secrétaires", icon: UserCog },
  { href: "/clinique/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/clinique/notes", label: "Notes internes", icon: StickyNote },
  { href: "/clinique/rapport-journalier", label: "Rapport", icon: Printer },
  { href: "/clinique/parametres", label: "Paramètres", icon: Settings },
];

export function CliniqueSidebarNav({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/clinique-login");
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white"
        style={{ background: "#0891B2" }}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={[
          "fixed md:static inset-y-0 left-0 z-40",
          "w-64 flex flex-col",
          "transform transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        style={{ background: "#134E4A" }}
      >
        {/* Brand + clinic name */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "#0891B2" }}
            >
              <Building2 className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-black text-lg tracking-tight leading-none">
              Doktori<span style={{ color: "#5EEAD4" }}>.tn</span>
            </span>
          </div>
          <div className="ml-0.5">
            <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "#5EEAD4" }}>
              Espace Clinique
            </p>
            <p className="text-white text-sm font-semibold truncate" title={clinicName}>
              {clinicName}
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "text-white font-semibold"
                    : "text-teal-100/70 hover:text-white hover:bg-white/10",
                ].join(" ")}
                style={active ? { background: "#0891B2" } : undefined}
              >
                <Icon
                  className={["h-4 w-4 flex-shrink-0", active ? "text-white" : "text-teal-300"].join(" ")}
                  strokeWidth={2.5}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-white/10 pt-3">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-all disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
