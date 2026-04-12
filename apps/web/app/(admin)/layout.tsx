import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  moderator: "Modérateur",
  finance: "Finance",
  support: "Support",
  marketing: "Marketing",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin-login");

  const links = [
    { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/admin/medecins", label: "Médecins", icon: Stethoscope },
    { href: "/admin/validation", label: "Validation", icon: UserCheck },
    { href: "/admin/reviews", label: "Avis patients", icon: MessageSquare },
    { href: "/admin/stats", label: "Statistiques", icon: BarChart3 },
  ];

  const sosLinks = [
    { href: "/admin/sos", label: "SOS", icon: Radio },
    { href: "/admin/sos/sessions", label: "Sessions SOS", icon: Activity },
    { href: "/admin/sos/kpis", label: "KPIs SOS", icon: BarChart3 },
    { href: "/admin/sos/coverage", label: "Couverture", icon: Map },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Doktori Admin</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {ROLE_LABELS[admin.role] ?? admin.role}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
          <div className="pt-3 pb-1 px-3">
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 text-xs text-slate-400 truncate">
            <div className="font-semibold text-slate-200 truncate">{admin.name}</div>
            <div className="truncate">{admin.email}</div>
          </div>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
