"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  moderator: "Modérateur",
  finance: "Finance",
  support: "Support",
  marketing: "Marketing",
};

const links = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/medecins", label: "Médecins", icon: Stethoscope },
  { href: "/admin/patients", label: "Patients", icon: Users },
  { href: "/admin/rendez-vous", label: "Rendez-vous", icon: Calendar },
  { href: "/admin/validation", label: "Validation", icon: UserCheck },
  { href: "/admin/reviews", label: "Avis patients", icon: MessageSquare },
];

const contentLinks = [
  { href: "/admin/blog", label: "Blog", icon: BookOpen },
];

const orgLinks = [
  { href: "/admin/finance", label: "Finance", icon: CreditCard, exact: true },
  { href: "/admin/finance/revenue", label: "Revenus", icon: TrendingUp },
  { href: "/admin/finance/doctors", label: "Facturation médecins", icon: Receipt },
  { href: "/admin/promotions", label: "Promotions", icon: Tag },
  { href: "/admin/communications", label: "Communications", icon: Phone },
  { href: "/admin/cliniques", label: "Cliniques", icon: Building2 },
  { href: "/admin/secretaires", label: "Secrétaires", icon: UserCog },
  { href: "/admin/parrainage", label: "Parrainage", icon: Star },
  { href: "/admin/catalog/specialites", label: "Catalogue", icon: FileText },
];

const sosLinks = [
  { href: "/admin/sos", label: "SOS", icon: Radio, exact: true },
  { href: "/admin/sos/sessions", label: "Sessions SOS", icon: Activity },
  { href: "/admin/sos/kpis", label: "KPIs SOS", icon: BarChart3 },
  { href: "/admin/sos/coverage", label: "Couverture", icon: Map },
];

const analyticsLinks = [
  { href: "/admin/analytics/mobile", label: "Analytics mobile", icon: Smartphone },
  { href: "/admin/stats", label: "Statistiques", icon: BarChart3 },
];

const systemLinks = [
  { href: "/admin/acces/utilisateurs", label: "Accès & rôles", icon: Shield },
  { href: "/admin/acces/audit", label: "Journal d'audit", icon: FileText },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

interface AdminSidebarNavProps {
  adminName: string;
  adminEmail: string;
  adminRole: string;
}

export function AdminSidebarNav({ adminName, adminEmail, adminRole }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<{ validationPending: number; reviewsPending: number }>({
    validationPending: 0,
    reviewsPending: 0,
  });

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

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
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
                {ROLE_LABELS[adminRole] ?? adminRole}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Étendre" : "Réduire"}
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
          {links.map((l) => {
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
                {!collapsed && <span className="flex-1">{l.label}</span>}
                {!collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {(badgeByHref[l.href] ?? 0) > 99 ? "99+" : badgeByHref[l.href]}
                  </span>
                )}
              </Link>
            );
          })}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Contenu
            </p>
          </div>

          {contentLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={linkClass(l.href)}
              >
                <span className="relative inline-flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                  {collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
                  )}
                </span>
                {!collapsed && <span className="flex-1">{l.label}</span>}
                {!collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {(badgeByHref[l.href] ?? 0) > 99 ? "99+" : badgeByHref[l.href]}
                  </span>
                )}
              </Link>
            );
          })}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Organisations
            </p>
          </div>

          {orgLinks.map((l) => {
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
                {!collapsed && <span className="flex-1">{l.label}</span>}
                {!collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {(badgeByHref[l.href] ?? 0) > 99 ? "99+" : badgeByHref[l.href]}
                  </span>
                )}
              </Link>
            );
          })}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Opérations
            </p>
          </div>

          {sosLinks.map((l) => {
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
                {!collapsed && <span className="flex-1">{l.label}</span>}
                {!collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {(badgeByHref[l.href] ?? 0) > 99 ? "99+" : badgeByHref[l.href]}
                  </span>
                )}
              </Link>
            );
          })}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Analytics
            </p>
          </div>

          {analyticsLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={linkClass(l.href)}
              >
                <span className="relative inline-flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                  {collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
                  )}
                </span>
                {!collapsed && <span className="flex-1">{l.label}</span>}
                {!collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {(badgeByHref[l.href] ?? 0) > 99 ? "99+" : badgeByHref[l.href]}
                  </span>
                )}
              </Link>
            );
          })}

          <div className={`pt-3 pb-1 px-3 ${collapsed ? "hidden" : ""}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Système
            </p>
          </div>

          {systemLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={linkClass(l.href)}
              >
                <span className="relative inline-flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                  {collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
                  )}
                </span>
                {!collapsed && <span className="flex-1">{l.label}</span>}
                {!collapsed && (badgeByHref[l.href] ?? 0) > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {(badgeByHref[l.href] ?? 0) > 99 ? "99+" : badgeByHref[l.href]}
                  </span>
                )}
              </Link>
            );
          })}
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
            title={collapsed ? "Déconnexion" : undefined}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </Link>
        </div>
      </aside>

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
