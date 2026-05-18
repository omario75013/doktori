"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
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
  FlaskConical,
  MessageSquare,
  Settings,
  LogOut,
  Building2,
  Armchair,
  Building,
  DoorOpen,
  FileText,
  Award,
  DollarSign,
  ClipboardList,
  ScanLine,
  Inbox,
} from "lucide-react";

type LinkDef = {
  href: string;
  key: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const LINKS: LinkDef[] = [
  { href: "/clinique/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/clinique/agenda", key: "agenda", icon: CalendarDays },
  { href: "/clinique/planning", key: "planning", icon: CalendarRange },
  { href: "/clinique/rendez-vous", key: "rendezVous", icon: Calendar },
  { href: "/clinique/rdv-requests", key: "rdvRequests", icon: Inbox },
  { href: "/clinique/medecins", key: "medecins", icon: Users },
  { href: "/clinique/patients", key: "patients", icon: UserRound },
  { href: "/clinique/secretaires", key: "secretaires", icon: UserCog },
  { href: "/clinique/statistiques", key: "statistiques", icon: BarChart3 },
  { href: "/clinique/finance", key: "finance", icon: DollarSign },
  { href: "/clinique/qualite", key: "qualite", icon: Award },
  { href: "/clinique/salle-attente", key: "salleAttente", icon: Armchair },
  { href: "/clinique/labos", key: "labos", icon: FlaskConical },
  { href: "/clinique/communication", key: "communication", icon: MessageSquare },
  { href: "/clinique/notes", key: "notes", icon: StickyNote },
  { href: "/clinique/rapport-journalier", key: "rapport", icon: Printer },
  { href: "/clinique/cnam", key: "cnam", icon: FileText },
  { href: "/clinique/audit", key: "audit", icon: ClipboardList },
  { href: "/clinique/parametres/labos", key: "parametresLabos", icon: ScanLine },
  { href: "/clinique/parametres/sites", key: "sites", icon: Building },
  { href: "/clinique/parametres/salles", key: "salles", icon: DoorOpen },
  { href: "/clinique/parametres", key: "parametres", icon: Settings },
];

export function CliniqueSidebarNav({ clinicName }: { clinicName: string }) {
  const t = useTranslations("clinique.nav");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rdvRequestsCount, setRdvRequestsCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/clinique/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setRdvRequestsCount(Number(data.counts?.rdvRequests ?? 0));
      } catch {
        /* silent */
      }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/clinique-login");
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white"
        style={{ background: "#0891B2" }}
        aria-label={open ? t("closeMenu") : t("openMenu")}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={[
          "fixed md:static inset-y-0 left-0 z-40",
          "w-64 flex flex-col",
          "transform transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        style={{ background: "#134E4A" }}
      >
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
              {t("espace")}
            </p>
            <p className="text-white text-sm font-semibold truncate" title={clinicName}>
              {clinicName}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {LINKS.map(({ href, key, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const badge = key === "rdvRequests" && rdvRequestsCount > 0 ? rdvRequestsCount : 0;
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
                <span className="flex-1">{t(key as Parameters<typeof t>[0])}</span>
                {badge > 0 && (
                  <span
                    className="inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: "#EF4444" }}
                    aria-label={`${badge} nouvelles demandes`}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-5 border-t border-white/10 pt-3">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-all disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
            {loggingOut ? t("loggingOut") : t("logout")}
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
