"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Stethoscope,
  UserCheck,
  BarChart3,
  Shield,
  MessageSquare,
  LogOut,
  Radio,
  Activity,
  Map,
  Menu,
  X,
  Smartphone,
  Users,
  Calendar,
  CreditCard,
  Building2,
  UserCog,
  Settings,
  Star,
  Phone,
  FileText,
  TrendingUp,
  Receipt,
  Tag,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ADMIN_COLLAPSED_KEY = "doktori_admin_sidebar_collapsed";

type NavLink = { href: string; key: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

const links: NavLink[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/medecins", key: "medecins", icon: Stethoscope },
  { href: "/admin/patients", key: "patients", icon: Users },
  { href: "/admin/rendez-vous", key: "rendezVous", icon: Calendar },
  { href: "/admin/validation", key: "validation", icon: UserCheck },
  { href: "/admin/reviews", key: "reviews", icon: MessageSquare },
];

const contentLinks: NavLink[] = [
  { href: "/admin/blog", key: "blog", icon: BookOpen },
  { href: "/admin/templates", key: "templates", icon: FileText },
];

const orgLinks: NavLink[] = [
  { href: "/admin/finance", key: "finance", icon: CreditCard, exact: true },
  { href: "/admin/finance/revenue", key: "revenus", icon: TrendingUp },
  { href: "/admin/finance/doctors", key: "facturations", icon: Receipt },
  { href: "/admin/promotions", key: "promotions", icon: Tag },
  { href: "/admin/communications", key: "communications", icon: Phone },
  { href: "/admin/cliniques", key: "cliniques", icon: Building2 },
  { href: "/admin/secretaires", key: "secretaires", icon: UserCog },
  { href: "/admin/parrainage", key: "parrainage", icon: Star },
  { href: "/admin/catalog/specialites", key: "catalogue", icon: FileText },
];

const sosLinks: NavLink[] = [
  { href: "/admin/sos", key: "sos", icon: Radio, exact: true },
  { href: "/admin/sos/sessions", key: "sosSessions", icon: Activity },
  { href: "/admin/sos/kpis", key: "sosKpis", icon: BarChart3 },
  { href: "/admin/sos/coverage", key: "sosCoverage", icon: Map },
];

const analyticsLinks: NavLink[] = [
  { href: "/admin/analytics/mobile", key: "analyticsMobile", icon: Smartphone },
  { href: "/admin/stats", key: "statistiques", icon: BarChart3 },
];

const systemLinks: NavLink[] = [
  { href: "/admin/acces/utilisateurs", key: "acces", icon: Shield },
  { href: "/admin/acces/audit", key: "audit", icon: FileText },
  { href: "/admin/parametres", key: "parametres", icon: Settings },
];

interface AdminSidebarNavProps {
  adminName: string;
  adminEmail: string;
  adminRole: string;
}

export function AdminSidebarNav({ adminName, adminEmail, adminRole }: AdminSidebarNavProps) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<{ validationPending: number; reviewsPending: number }>({
    validationPending: 0,
    reviewsPending: 0,
  });

  const ROLE_LABEL_KEYS: Record<string, string> = {
    super_admin: "roleSuperAdmin",
    moderator: "roleModerator",
    finance: "roleFinance",
    support: "roleSupport",
    marketing: "roleMarketing",
  };

  useEffect(() => {
    setCollapsed(localStorage.getItem(ADMIN_COLLAPSED_KEY) === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/admin/pending-counts", { cache: "no-store" });
        if (r.ok && !cancelled) setBadges(await r.json());
      } catch {
        /* silent */
      }
    }
    load();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const badgeByHref: Record<string, number> = {
    "/admin/validation": badges.validationPending,
    "/admin/reviews": badges.reviewsPending,
  };

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(ADMIN_COLLAPSED_KEY, next ? "1" : "0");
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function linkClass(href: string, exact = false) {
    const active = isActive(href, exact);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
      active
        ? "bg-teal-600 text-white font-medium"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    } ${collapsed ? "justify-center" : ""}`;
  }

  function renderLinks(group: NavLink[]) {
    return group.map((l) => {
      const Icon = l.icon;
      return (
        <Link
          key={l.href}
          href={l.href}
          onClick={() => setOpen(false)}
          className={linkClass(l.href, l.exact)}
        >
          <span className="relative inline-flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
            {collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
            )}
          </span>
          {!collapsed && <span className="flex-1">{t(l.key as Parameters<typeof t>[0])}</span>}
          {!collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {(badgeByHref[l.href] ?? 0) > 99 ? "99+" : badgeByHref[l.href]}
            </span>
          )}
        </Link>
      );
    });
  }

  const roleKey = ROLE_LABEL_KEYS[adminRole] ?? null;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg"
        aria-label={open ? t("closeMenu") : t("openMenu")}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          ${collapsed ? "w-16" : "w-64"} bg-slate-900 text-white flex flex-col
          transform transition-[transform,width] duration-200
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Doktori Admin</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {roleKey ? t(roleKey as Parameters<typeof t>[0]) : adminRole}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t("expand") : t("collapse")}
            className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {renderLinks(links)}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {t("sectionContenu")}
            </p>
          </div>
          {renderLinks(contentLinks)}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {t("sectionOrganisations")}
            </p>
          </div>
          {renderLinks(orgLinks)}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {t("sectionOperations")}
            </p>
          </div>
          {renderLinks(sosLinks)}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {t("sectionAnalytics")}
            </p>
          </div>
          {renderLinks(analyticsLinks)}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {t("sectionSysteme")}
            </p>
          </div>
          {renderLinks(systemLinks)}
        </nav>

        <div className="p-3 border-t border-slate-800">
          {!collapsed && (
            <div className="px-3 py-2 text-xs text-slate-400 truncate">
              <div className="font-semibold text-slate-200 truncate">{adminName}</div>
              <div className="truncate">{adminEmail}</div>
            </div>
          )}
          <Link
            href="/api/auth/signout"
            title={collapsed ? t("logout") : undefined}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{t("logout")}</span>}
          </Link>
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
