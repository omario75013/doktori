"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { osNotify } from "@/lib/os-notify";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Users,
  LogOut,
  MessagesSquare,
  Plane,
  Bell,
  UserCog,
  ClipboardList,
} from "lucide-react";

type Perm =
  | "agenda"
  | "patients"
  | "patientsCreate"
  | "patientsEdit"
  | "patientsDelete"
  | "rendezVous"
  | "rendezVousCreate"
  | "rendezVousEdit"
  | "rendezVousCancel"
  | "messagerie"
  | "wallet"
  | "factures"
  | "motifs"
  | "cabinets"
  | "teleconsult";

type LinkDef = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Link is shown if ANY of these permissions is true. `null` = always show. */
  anyOf?: Perm[];
};

const LINKS: LinkDef[] = [
  { href: "/secretaire/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/secretaire/calendrier", label: "Calendrier", icon: CalendarDays, anyOf: ["rendezVous", "agenda"] },
  { href: "/secretaire/rendez-vous", label: "Rendez-vous", icon: CalendarClock, anyOf: ["rendezVous", "rendezVousCreate", "rendezVousEdit", "rendezVousCancel"] },
  { href: "/secretaire/patients", label: "Patients", icon: Users, anyOf: ["patients", "patientsCreate", "patientsEdit", "patientsDelete"] },
  { href: "/secretaire/messagerie", label: "Messagerie équipe", icon: MessagesSquare },
  { href: "/secretaire/notifications", label: "Notifications", icon: Bell },
  { href: "/secretaire/conges", label: "Mes congés", icon: Plane },
  { href: "/secretaire/profil", label: "Mon profil", icon: UserCog },
];

export function SecretaireSidebarNav({
  secretaireName,
  doctorName,
}: {
  secretaireName: string;
  doctorName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [perms, setPerms] = useState<Partial<Record<Perm, boolean>> | null>(null);
  const prevUnreadRef = useRef({ msg: 0, notif: 0, initialized: false });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch("/api/staff/conversations/unread", { cache: "no-store" }),
          fetch("/api/secretary/notifications", { cache: "no-store" }),
          fetch("/api/secretary/profile", { cache: "no-store" }),
        ]);
        if (!cancelled) {
          if (r1.ok) {
            const nMsg = Number((await r1.json()).count ?? 0);
            if (prevUnreadRef.current.initialized && nMsg > prevUnreadRef.current.msg) {
              osNotify({ title: "💬 Nouveau message", body: "Vous avez un nouveau message." });
            }
            prevUnreadRef.current.msg = nMsg;
            setUnreadMsg(nMsg);
          }
          if (r2.ok) {
            const nNotif = Number((await r2.json()).unreadCount ?? 0);
            if (prevUnreadRef.current.initialized && nNotif > prevUnreadRef.current.notif) {
              osNotify({ title: "🔔 Nouvelle notification", body: "Ouvrez votre feed." });
            }
            prevUnreadRef.current.notif = nNotif;
            setUnreadNotif(nNotif);
          }
          prevUnreadRef.current.initialized = true;
          if (r3.ok) {
            const data = await r3.json();
            setPerms((data.permissions as Partial<Record<Perm, boolean>>) ?? {});
          }
        }
      } catch {
        /* silent */
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const visibleLinks = LINKS.filter((l) => {
    if (!l.anyOf) return true;
    if (!perms) return true; // show optimistically until perms load
    return l.anyOf.some((p) => perms[p] === true);
  });

  const badgeByHref: Record<string, number> = {
    "/secretaire/messagerie": unreadMsg,
    "/secretaire/notifications": unreadNotif,
  };

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/secretaire-login");
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
        {/* Brand + context */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "#0891B2" }}
            >
              <ClipboardList className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-black text-lg tracking-tight leading-none">
              Doktori<span style={{ color: "#5EEAD4" }}>.tn</span>
            </span>
          </div>
          <div className="ml-0.5">
            <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "#5EEAD4" }}>
              Espace Secrétaire
            </p>
            <p className="text-white text-sm font-semibold truncate" title={secretaireName}>
              {secretaireName}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "#5EEAD4" }} title={doctorName}>
              Pour Dr. {doctorName}
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const badge = badgeByHref[href] ?? 0;
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
                <span className="relative inline-flex items-center justify-center">
                  <Icon
                    className={["h-4 w-4 flex-shrink-0", active ? "text-white" : "text-teal-300"].join(" ")}
                    strokeWidth={2.5}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#134E4A]" />
                  )}
                </span>
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
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
