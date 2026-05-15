"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  Users,
  Settings,
  LogOut,
  FlaskConical,
  MessageSquare,
  Search,
  FileText,
  Folder,
  Clock,
  CalendarDays,
} from "lucide-react";

type LinkDef = {
  href: string;
  key: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const LINKS: LinkDef[] = [
  { href: "/laboratoire/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/laboratoire/commandes", key: "orders", icon: ClipboardList },
  { href: "/laboratoire/walk-in", key: "walkIn", icon: UserPlus },
  { href: "/laboratoire/patients", key: "patients", icon: Users },
  { href: "/laboratoire/analyses", key: "analyses", icon: FlaskConical },
  { href: "/laboratoire/resultats", key: "results", icon: FileText },
  { href: "/laboratoire/documents", key: "documents", icon: Folder },
  { href: "/laboratoire/agenda", key: "calendar", icon: CalendarDays },
  { href: "/laboratoire/horaires", key: "schedule", icon: Clock },
  { href: "/laboratoire/messages", key: "messages", icon: MessageSquare },
  { href: "/laboratoire/recherche", key: "search", icon: Search },
  { href: "/laboratoire/parametres", key: "settings", icon: Settings },
];

type StaffBadge = {
  name: string;
  labUserRole: "admin" | "technician";
};

export function LaboratoireSidebarNav({
  labName,
  staffBadge,
}: {
  labName: string;
  staffBadge?: StaffBadge | null;
}) {
  const t = useTranslations("laboratoire.nav");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: session } = useSession();
  const parentClinicId = (session?.user as { parentClinicId?: string | null } | undefined)?.parentClinicId ?? null;
  const logoutDest = parentClinicId ? "/clinique-login" : "/laboratoire-login";

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.push(logoutDest);
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white"
        style={{ background: "#16A34A" }}
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
        style={{ background: "#14532D" }}
      >
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "#16A34A" }}
            >
              <FlaskConical className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-black text-lg tracking-tight leading-none">
              Doktori<span style={{ color: "#86EFAC" }}>.tn</span>
            </span>
          </div>
          <div className="ml-0.5">
            <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: "#86EFAC" }}>
              {t("espace")}
            </p>
            <p className="text-white text-sm font-semibold truncate" title={labName}>
              {labName}
            </p>
            {staffBadge && (
              <div className="mt-1 flex flex-col gap-0.5">
                <p className="text-green-200 text-xs truncate">{staffBadge.name}</p>
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit"
                  style={{ background: staffBadge.labUserRole === "admin" ? "#15803D" : "#166534", color: "#BBF7D0" }}
                >
                  {staffBadge.labUserRole === "admin"
                    ? t("badgeAdmin" as Parameters<typeof t>[0])
                    : t("badgeTechnician" as Parameters<typeof t>[0])}
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {LINKS.map(({ href, key, icon: Icon }) => {
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
                    : "text-green-100/70 hover:text-white hover:bg-white/10",
                ].join(" ")}
                style={active ? { background: "#16A34A" } : undefined}
              >
                <Icon
                  className={["h-4 w-4 flex-shrink-0", active ? "text-white" : "text-green-300"].join(" ")}
                  strokeWidth={2.5}
                />
                {t(key as Parameters<typeof t>[0])}
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
