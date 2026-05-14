"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BadgeCheck,
  CalendarDays,
  CalendarClock,
  Users,
  ClipboardList,
  Building2,
  Home,
  FileSignature,
  FileText,
  Siren,
  BarChart3,
  UserCog,
  Gift,
  CreditCard,
  Video,
  MessagesSquare,
  Wallet,
  Receipt,
  UserCircle,
  Settings,
  Network,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { usePlan } from "@/lib/use-plan";

const COLLAPSED_KEY = "doktori_sidebar_collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  dot?: boolean;
  badge?: number;
  feature?: string; // plan feature gate key
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export function SidebarNav({
  userName: _userName,
  verificationStatus,
}: {
  userName?: string | null;
  verificationStatus?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadStaff, setUnreadStaff] = useState(0);
  const [pendingRefs, setPendingRefs] = useState(0);
  const t = useTranslations("medecin.nav");
  const { hasFeature } = usePlan();

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Messagerie now hosts peer-doctor chat (the patient ↔ doctor
        // surface was retired). The badge counts unread peer messages.
        const [r1, r2, r3] = await Promise.all([
          fetch("/api/doctor/peer-messages/unread-count", { cache: "no-store" }),
          fetch("/api/staff/conversations/unread", { cache: "no-store" }),
          fetch("/api/doctor/referrals/pending-count", { cache: "no-store" }),
        ]);
        if (!cancelled) {
          if (r1.ok) setUnreadMsg((await r1.json()).count ?? 0);
          if (r2.ok) setUnreadStaff((await r2.json()).count ?? 0);
          if (r3.ok) setPendingRefs((await r3.json()).count ?? 0);
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

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
  }

  const showVerificationDot =
    verificationStatus === "pending" || verificationStatus === "rejected";

  const groups: NavGroup[] = [
    {
      label: t("groupMain"),
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
        {
          href: "/verification",
          label: t("verification"),
          icon: BadgeCheck,
          dot: showVerificationDot,
        },
        { href: "/calendrier", label: t("calendrier"), icon: CalendarDays },
        { href: "/rendez-vous", label: t("rendezVous"), icon: CalendarClock },
      ],
    },
    {
      label: t("groupPatients"),
      items: [{ href: "/patients", label: t("patients"), icon: Users }],
    },
    {
      label: t("groupNetwork"),
      items: [
        { href: "/reseau", label: t("networkDoctors"), icon: Network, feature: "reseau" },
        { href: "/reseau/referencements", label: t("referrals"), icon: FileText, feature: "reseau", badge: pendingRefs },
      ],
    },
    {
      label: t("groupCommunication"),
      items: [
        { href: "/messagerie", label: t("messagerie"), icon: MessagesSquare, badge: unreadMsg },
        { href: "/messagerie-equipe", label: t("staff"), icon: UserCog, badge: unreadStaff },
      ],
    },
    {
      label: t("groupOffice"),
      items: [
        { href: "/modeles", label: t("modeles"), icon: FileText },
        { href: "/motifs", label: t("motifs"), icon: ClipboardList },
        { href: "/cabinets", label: t("cabinets"), icon: Building2 },
        { href: "/domicile", label: t("domicile"), icon: Home },
        { href: "/conventions", label: t("conventions"), icon: FileSignature },
        { href: "/cnam", label: t("cnam"), icon: FileText, feature: "cnam" },
        { href: "/sos-medecin", label: t("sos"), icon: Siren },
        { href: "/teleconsultation", label: t("teleconsultation"), icon: Video, feature: "teleconsult" },
        { href: "/secretaires", label: t("secretaires"), icon: UserCog },
      ],
    },
    {
      label: t("groupFinances"),
      items: [
        { href: "/wallet", label: t("wallet"), icon: Wallet, feature: "wallet" },
        { href: "/factures", label: t("factures"), icon: Receipt },
        { href: "/abonnement", label: t("abonnement"), icon: CreditCard },
      ],
    },
    {
      label: t("groupMe"),
      items: [
        { href: "/stats", label: t("stats"), icon: BarChart3, feature: "stats" },
        { href: "/parrainage", label: t("parrainage"), icon: Gift, feature: "parrainage" },
        { href: "/profil", label: t("profil"), icon: UserCircle },
        { href: "/profil/parametres", label: t("settings"), icon: Settings },
      ],
    },
  ];

  const width = collapsed ? "w-16" : "w-56";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        className="md:hidden fixed top-3 left-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white shadow-lg"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/40"
        />
      )}

      <aside
        data-tour-id="sidebar"
        className={`
          ${width}
          fixed md:static inset-y-0 left-0 z-30
          bg-white text-[color:var(--ink-700)] border-r border-[color:var(--line-cool)]
          transform transition-[transform,width] duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          flex flex-col
        `}
      >
        <div
          className="flex items-center justify-between px-3 border-b border-[color:var(--line-cool)]"
          style={{ height: 56 }}
        >
          {!collapsed && (
            <span className="text-lg font-extrabold text-[color:var(--ink-900)]">Doktori</span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--ink-500)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--ink-900)] transition-colors ml-auto"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink-400)]">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const locked = item.feature ? !hasFeature(item.feature) : false;
                  return (
                    <li key={item.href}>
                      <Link
                        href={locked ? "/abonnement" : item.href}
                        onClick={() => setOpen(false)}
                        data-tour-id={`nav-${item.href.replace(/^\//, "").replace(/\//g, "-") || "dashboard"}`}
                        title={collapsed ? item.label : locked ? "Passer à Pro" : undefined}
                        className={`
                          group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors
                          ${locked ? "opacity-50 cursor-not-allowed text-[color:var(--ink-400)]" : active ? "bg-[color:var(--primary-600)] text-white" : "text-[color:var(--ink-700)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--ink-900)]"}
                          ${collapsed ? "justify-center" : ""}
                        `}
                      >
                        <span className="relative inline-flex items-center justify-center">
                          <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                          {item.dot && !locked && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
                          )}
                        </span>
                        {!collapsed && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                        {!collapsed && locked && (
                          <Lock className="h-3 w-3 shrink-0 text-[color:var(--ink-400)]" />
                        )}
                        {!collapsed && !locked && item.badge && item.badge > 0 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                        {collapsed && item.badge && item.badge > 0 ? (
                          <span className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-red-500" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
