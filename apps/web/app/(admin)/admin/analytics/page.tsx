import { requireAdmin } from "@/lib/admin-auth";
import { db, doctors, patients, appointments, subscriptions } from "@doktori/db";
import { count, eq, gte, and, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  Users,
  Stethoscope,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Map,
  Trophy,
  GitBranch,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">—</span>;
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
        <TrendingUp className="w-3 h-3" />
        +{value}%
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500">
        <TrendingDown className="w-3 h-3" />
        {value}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400">
      <Minus className="w-3 h-3" />0%
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsOverviewPage() {
  const admin = await requireAdmin([]);
  if (!admin || admin instanceof Response) redirect("/admin-login");

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    [{ v: apptThisMonth }],
    [{ v: apptLastMonth }],
    [{ v: patientsThisMonth }],
    [{ v: patientsLastMonth }],
    [{ v: doctorsThisMonth }],
    [{ v: doctorsLastMonth }],
    [{ v: activeSubs }],
  ] = await Promise.all([
    db.select({ v: count() }).from(appointments).where(gte(appointments.createdAt, startOfThisMonth)),
    db
      .select({ v: count() })
      .from(appointments)
      .where(and(gte(appointments.createdAt, startOfLastMonth), lt(appointments.createdAt, startOfThisMonth))),
    db.select({ v: count() }).from(patients).where(gte(patients.createdAt, startOfThisMonth)),
    db
      .select({ v: count() })
      .from(patients)
      .where(and(gte(patients.createdAt, startOfLastMonth), lt(patients.createdAt, startOfThisMonth))),
    db.select({ v: count() }).from(doctors).where(gte(doctors.createdAt, startOfThisMonth)),
    db
      .select({ v: count() })
      .from(doctors)
      .where(and(gte(doctors.createdAt, startOfLastMonth), lt(doctors.createdAt, startOfThisMonth))),
    db.select({ v: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
  ]);

  const kpis = [
    {
      label: "Rendez-vous ce mois",
      value: Number(apptThisMonth),
      prev: Number(apptLastMonth),
      icon: CalendarCheck,
      accent: "from-teal-500 to-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Nouveaux patients",
      value: Number(patientsThisMonth),
      prev: Number(patientsLastMonth),
      icon: Users,
      accent: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Nouveaux médecins",
      value: Number(doctorsThisMonth),
      prev: Number(doctorsLastMonth),
      icon: Stethoscope,
      accent: "from-indigo-500 to-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Abonnements actifs",
      value: Number(activeSubs),
      prev: null as number | null,
      icon: CreditCard,
      accent: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const subPages = [
    {
      href: "/admin/analytics/funnel",
      icon: GitBranch,
      label: "Funnel de réservation",
      description: "Analyse des étapes de conversion des rendez-vous",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      href: "/admin/analytics/performance",
      icon: Trophy,
      label: "Scorecard médecins",
      description: "Taux d'annulation, no-show, avis et revenus par médecin",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      href: "/admin/analytics/regions",
      icon: Map,
      label: "Répartition régionale",
      description: "Rendez-vous par ville et spécialité (30 derniers jours)",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      href: "/admin/analytics/mobile",
      icon: BarChart3,
      label: "Analytics mobile",
      description: "Activité iOS / Android — événements et utilisateurs",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  const monthName = startOfThisMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics & Rapports</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble — {monthName}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, prev, icon: Icon, accent, bg }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {label}
              </p>
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center`}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {value.toLocaleString("fr-FR")}
            </p>
            {prev !== null && (
              <div className="flex items-center gap-2">
                <PctBadge value={pct(value, prev)} />
                <span className="text-xs text-slate-400">vs mois précédent ({prev.toLocaleString("fr-FR")})</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sub-page links */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Rapports détaillés</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subPages.map(({ href, icon: Icon, label, description, color, bgColor }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                {label}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
