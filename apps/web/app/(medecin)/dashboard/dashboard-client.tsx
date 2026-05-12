"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  Clock,
  AlertCircle,
  Video,
  Wallet,
  CheckCircle,
  CalendarDays,
  ArrowRight,
  Users,
  Shield,
  XCircle,
  Star,
  TrendingUp,
  Activity,
  CalendarPlus,
  UserPlus,
  BarChart2,
  UserCheck,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { DashboardCharts } from "./dashboard-charts";
import { DoctorOnboarding } from "@/components/doctor-onboarding";
import { GuidedTour } from "@/components/guided-tour";

// ─── Types ────────────────────────────────────────────────────────────────────

type TodayAppt = {
  id: string;
  startsAt: Date;
  status: string;
  type: string;
  reason: string | null;
  checkedInAt?: Date | null;
  patientName: string;
  patientPhone: string | null;
};

type UpcomingAppt = {
  id: string;
  startsAt: Date;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
};

type ActivityItem = {
  id: string;
  status: string;
  startsAt: string;
  updatedAt: string;
  patientName: string;
};

type DashboardClientProps = {
  doctorName: string;
  rangeDays?: number;
  todayCount: number;
  toConfirm: number;
  noShowCount: number;
  teleconsultCount: number;
  walletBalance: number;
  hasTeleconsult: boolean;
  consultationMode: string;
  todayAppts: TodayAppt[];
  upcomingAppts: UpcomingAppt[];
  verificationStatus?: string;
  verificationNote?: string | null;
  smsUsed?: number;
  smsLimit?: number;
  smsPlan?: string;
  waitingRoomCount?: number;
  waitingPatients?: { id: string; patientName: string; checkedInAt: Date; startsAt: Date }[];
  // New quick stats
  totalPatients?: number;
  monthTotal?: number;
  completionRate?: number | null;
  averageRating?: number;
  recentActivity?: ActivityItem[];
};

// ─── Status badge/border config (labels resolved at render time via t()) ───────

const STATUS_BADGE_BORDER: Record<string, { badge: string; border: string }> = {
  pending: {
    badge: "bg-orange-100 text-orange-700",
    border: "border-l-orange-400",
  },
  confirmed: {
    badge: "bg-green-100 text-green-700",
    border: "border-l-green-400",
  },
  cancelled: {
    badge: "bg-gray-100 text-gray-500",
    border: "border-l-gray-300",
  },
  completed: {
    badge: "bg-blue-100 text-blue-700",
    border: "border-l-blue-400",
  },
  no_show: {
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-400",
  },
  doctor_noshow: {
    badge: "bg-red-100 text-red-700",
    border: "border-l-red-400",
  },
};

// ─── SMS Counter Card ─────────────────────────────────────────────────────────

/* ─── KpiPanel — groups the small KPIs into a single horizontal card ── */
function KpiPanel({
  kpis,
}: {
  kpis: Array<{
    label: string;
    value: string | number;
    sublabel?: string;
    icon: React.ElementType;
    iconBg: string;
    accentColor: string;
  }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="ds-card overflow-hidden p-0"
    >
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ gap: 1, background: "var(--line-cool)" }}
      >
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="p-4"
              style={{ background: "#FFFFFF" }}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  className="text-[12px] font-bold uppercase tracking-wider truncate"
                  style={{ color: "var(--ink-500)" }}
                >
                  {k.label}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${k.iconBg}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
              </div>
              <div
                className="text-[26px] font-extrabold leading-none tabular-nums"
                style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
              >
                {k.value}
              </div>
              {k.sublabel && (
                <div
                  className="text-[11.5px] mt-1"
                  style={{ color: "var(--ink-500)" }}
                >
                  {k.sublabel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── DayOverviewCard — at-a-glance summary of TODAY's work ────────────── */
function DayOverviewCard({
  todayAppts,
  waitingCount,
  completionRate,
}: {
  todayAppts: TodayAppt[];
  waitingCount: number;
  completionRate: number | null;
}) {
  const t = useTranslations("medecin.dashboard");
  // Live polling: re-fetch the waiting-room count + today's appointments every
  // 15s so the doctor sees check-ins from the secretary in near real-time.
  const [liveWaiting, setLiveWaiting] = useState(waitingCount);
  const [liveAppts, setLiveAppts] = useState(todayAppts);
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/doctor/today-summary", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (typeof data.waitingCount === "number") setLiveWaiting(data.waitingCount);
        if (Array.isArray(data.todayAppts)) {
          setLiveAppts(
            data.todayAppts.map((a: { id: string; startsAt: string; patientName: string }) => ({
              ...a,
              startsAt: new Date(a.startsAt),
            })) as TodayAppt[],
          );
        }
      } catch {
        /* network blip — keep current values */
      }
    }
    const id = setInterval(refresh, 15_000);
    // Also refresh when the tab regains focus so the doctor doesn't see stale
    // data after switching apps.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const effectiveAppts = liveAppts.length > 0 ? liveAppts : todayAppts;
  const effectiveWaiting = liveWaiting;
  const now = new Date();
  // Sort by startsAt to find the next upcoming today (live data)
  const sorted = [...effectiveAppts].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const next = sorted.find((a) => new Date(a.startsAt).getTime() >= now.getTime()) ?? null;
  const remaining = sorted.filter((a) => new Date(a.startsAt).getTime() >= now.getTime()).length;
  const done = effectiveAppts.length - remaining;

  const cells: Array<{
    label: string;
    value: string;
    sub?: string;
    tone: "primary" | "rose" | "amber" | "mint";
    href: string;
  }> = [
    {
      label: t("kpiWaitingPatients"),
      value: String(effectiveWaiting),
      sub: effectiveWaiting > 0 ? t("kpiWaitingPatientsSub") : t("kpiNoPatients"),
      tone: effectiveWaiting > 0 ? "rose" : "primary",
      href: "/agenda",
    },
    {
      label: t("kpiNextAppt"),
      value: next
        ? new Date(next.startsAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      sub: next ? next.patientName : t("kpiNoneUpcoming"),
      tone: "primary",
      href: "/calendrier",
    },
    {
      label: t("today"),
      value: String(effectiveAppts.length),
      sub: t("kpiDonePending", { done, pending: remaining }),
      tone: "mint",
      href: "/calendrier",
    },
    {
      label: t("kpiCompletionRate"),
      value: completionRate !== null ? `${completionRate}%` : "—",
      sub: t("kpiLast30Days"),
      tone: "amber",
      href: "/stats",
    },
  ];

  const toneStyle = (t: typeof cells[number]["tone"]) =>
    t === "rose"
      ? { background: "#FEE2E2", color: "#9F1239" }
      : t === "amber"
      ? { background: "#FEF3C7", color: "#92400E" }
      : t === "mint"
      ? { background: "#D1FAE5", color: "#065F46" }
      : { background: "var(--primary-50)", color: "var(--primary-700)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="ds-card overflow-hidden p-0"
    >
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ gap: 1, background: "var(--line-cool)" }}
      >
        {cells.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="block p-4 hover:bg-[color:var(--surface-2)] transition-colors"
            style={{ background: "#FFFFFF" }}
          >
            <div
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider mb-2"
              style={toneStyle(c.tone)}
            >
              {c.label}
            </div>
            <div
              className="text-[26px] font-extrabold leading-none"
              style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
            >
              {c.value}
            </div>
            {c.sub && (
              <div className="text-[12.5px] mt-1" style={{ color: "var(--ink-500)" }}>
                {c.sub}
              </div>
            )}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function SMSCounterCard({
  used,
  limit,
  plan,
  index = 0,
}: {
  used: number;
  limit: number;
  plan: string;
  index?: number;
}) {
  const tDash = useTranslations("medecin.dashboard");
  const isUnlimited = limit >= 999999;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isExhausted = !isUnlimited && used >= limit;
  const isNearLimit = !isUnlimited && pct >= 80 && !isExhausted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="relative ds-card p-5 overflow-hidden"
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
          isExhausted ? "bg-red-500" : isNearLimit ? "bg-yellow-400" : "bg-teal-500"
        }`}
      />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--ink-500)]">
            {tDash("smsThisMonth")}
          </div>
          <div className="text-xl font-black mt-1 text-[color:var(--ink-900)] tabular-nums">
            {isUnlimited ? tDash("unlimited") : `${used} / ${limit}`}
          </div>
          {!isUnlimited && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-gray-700">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isExhausted ? "bg-red-500" : isNearLimit ? "bg-yellow-400" : "bg-teal-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          {isExhausted && (
            <div className="mt-2 flex gap-2 flex-wrap">
              <a
                href="/abonnement"
                className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
              >
                {tDash("upgradeToPro")}
              </a>
            </div>
          )}
          {!isExhausted && !isUnlimited && (
            <div className="text-xs text-[color:var(--ink-400)] mt-1">
              {isNearLimit
                ? tDash("smsNearLimit", { remaining: limit - used })
                : tDash("smsRemaining", { remaining: limit - used })}
            </div>
          )}
          {isUnlimited && (
            <div className="text-xs text-teal-600 mt-1 font-medium">{tDash("planLabel", { plan })}</div>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isExhausted
              ? "bg-red-50 text-red-500"
              : isNearLimit
              ? "bg-yellow-50 text-yellow-500"
              : "bg-teal-50 text-teal-600"
          }`}
        >
          <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sublabel,
  accentColor,
  icon: Icon,
  iconBg,
  href,
  index = 0,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  accentColor: string;
  icon: React.ElementType;
  iconBg: string;
  href?: string;
  index?: number;
}) {
  // Try to extract a +18% / +12% trend hint from the sublabel so it can render
  // as a green pill in the top-right corner — matches the "Statistiques"
  // dashboard reference design.
  const trendMatch =
    typeof sublabel === "string" ? sublabel.match(/^([+-]\d+(?:\.\d+)?%?)/) : null;
  const trend = trendMatch?.[1];
  const trendIsUp = !!trend && trend.startsWith("+");

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.08)" }}
      className="ds-card p-5 overflow-hidden cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.5} />
        </div>
        {trend ? (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{
              background: trendIsUp ? "#D1FAE5" : "#FEE2E2",
              color: trendIsUp ? "#065F46" : "#991B1B",
            }}
          >
            {trend}
          </span>
        ) : (
          <span
            className={`block h-2 w-2 rounded-full ${accentColor}`}
            aria-hidden
          />
        )}
      </div>
      <div
        className="text-[28px] font-extrabold leading-none tabular-nums"
        style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
      >
        {value}
      </div>
      <div
        className="text-[13px] font-semibold mt-1.5"
        style={{ color: "var(--ink-700)" }}
      >
        {label}
      </div>
      {trend && (
        <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-400)" }}>
          {sublabel?.replace(/^[+-]\d+(?:\.\d+)?%?\s*/, "")}
        </div>
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

// ─── Mini Stat Card ────────────────────────────────────────────────────────────

function MiniStatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  index = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.5 + index * 0.07, ease: "easeOut" }}
      className="ds-card p-4 flex items-center gap-3"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-4 w-4" style={{ color: iconColor }} strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-black text-[color:var(--ink-900)] tabular-nums leading-tight">{value}</div>
        <div className="text-xs text-[color:var(--ink-500)] truncate">{label}</div>
      </div>
    </motion.div>
  );
}

// ─── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({
  type,
  mode,
  appointmentId,
  videoLabel,
  cabinetLabel,
}: {
  type: string;
  mode: string;
  appointmentId: string;
  videoLabel: string;
  cabinetLabel: string;
}) {
  if (type === "teleconsult") {
    return (
      <Link
        href={`/teleconsult-medecin/${appointmentId}`}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
      >
        <Video className="h-3 w-3" strokeWidth={2.5} />
        {videoLabel}
      </Link>
    );
  }
  if (mode === "both") {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
        {cabinetLabel}
      </span>
    );
  }
  return null;
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-5 w-1 rounded-full bg-primary" />
      <h2 className="font-extrabold text-base">{children}</h2>
    </div>
  );
}

// ─── Activity event label ──────────────────────────────────────────────────────

function activityLabel(
  item: ActivityItem,
  t: ReturnType<typeof useTranslations<"medecin.dashboard">>
): { text: string; dot: string } {
  const date = new Date(item.startsAt);
  const dateStr = format(date, "d MMM à HH:mm", { locale: fr });
  switch (item.status) {
    case "confirmed":
      return { text: t("activityNewApptConfirmed", { name: item.patientName, date: dateStr }), dot: "bg-green-400" };
    case "pending":
      return { text: t("activityNewApptPending", { name: item.patientName, date: dateStr }), dot: "bg-orange-400" };
    case "cancelled":
      return { text: t("activityApptCancelled", { name: item.patientName, date: dateStr }), dot: "bg-gray-400" };
    case "completed":
      return { text: t("activityConsultationDone", { name: item.patientName }), dot: "bg-blue-400" };
    case "no_show":
      return { text: t("activityNoShow", { name: item.patientName, date: dateStr }), dot: "bg-red-400" };
    default:
      return { text: t("activityApptUpdated", { name: item.patientName }), dot: "bg-slate-300" };
  }
}

// ─── Main client component ─────────────────────────────────────────────────────

export function DashboardClient({
  doctorName,
  rangeDays = 30,
  todayCount,
  toConfirm,
  noShowCount,
  teleconsultCount,
  walletBalance,
  hasTeleconsult,
  consultationMode,
  todayAppts,
  upcomingAppts,
  verificationStatus,
  verificationNote,
  smsUsed = 0,
  smsLimit = 200,
  smsPlan = "essentiel",
  totalPatients = 0,
  monthTotal = 0,
  completionRate = null,
  averageRating = 0,
  recentActivity = [],
  waitingRoomCount = 0,
  waitingPatients = [],
}: DashboardClientProps) {
  const t = useTranslations("medecin.dashboard");
  const tStatus = useTranslations("medecin.appointments.status");

  // Live KPI counters — server-rendered initial values, kept fresh by a
  // 15s poll on /api/doctor/today-summary so marking a no_show or
  // confirming a pending RDV elsewhere reflects on the dashboard without
  // a hard refresh.
  const [liveTodayCount, setLiveTodayCount] = useState(todayCount);
  const [liveToConfirm, setLiveToConfirm] = useState(toConfirm);
  const [liveNoShowCount, setLiveNoShowCount] = useState(noShowCount);
  // Mirror of the secretary's waiting-room counter so the doctor can
  // see "how many patients are physically waiting" without leaving the
  // dashboard. Polled on the same 15-second cadence as the other KPIs.
  const [liveWaitingCount, setLiveWaitingCount] = useState(waitingRoomCount);
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const [r1, r2] = await Promise.all([
          fetch("/api/doctor/today-summary", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/doctor/waiting-room", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        if (cancelled) return;
        if (r1.ok) {
          const d = await r1.json();
          if (typeof d.todayCount === "number") setLiveTodayCount(d.todayCount);
          if (typeof d.toConfirmCount === "number") setLiveToConfirm(d.toConfirmCount);
          if (typeof d.noShowMonthCount === "number") setLiveNoShowCount(d.noShowMonthCount);
        }
        if (r2.ok) {
          const w = await r2.json();
          if (typeof w.count === "number") setLiveWaitingCount(w.count);
        }
      } catch {
        /* ignore */
      }
    }
    void refresh();
    const id = setInterval(refresh, 15_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const kpis = [
    {
      label: t("today"),
      value: liveTodayCount,
      sublabel: t("appointments"),
      accentColor: "bg-primary",
      icon: Calendar,
      iconBg: "bg-cyan-50 text-cyan-600",
    },
    {
      label: t("toConfirm"),
      value: liveToConfirm,
      sublabel: t("pending"),
      accentColor: "bg-orange-400",
      icon: Clock,
      iconBg: "bg-orange-50 text-orange-500",
    },
    {
      label: t("noShows"),
      value: liveNoShowCount,
      sublabel: t("missed"),
      accentColor: "bg-red-400",
      icon: AlertCircle,
      iconBg: "bg-red-50 text-red-500",
    },
    {
      label: t("waitingRoom"),
      value: liveWaitingCount,
      sublabel: t("waitingRoomSub"),
      accentColor: "bg-teal-500",
      icon: Users,
      iconBg: "bg-teal-50 text-teal-600",
    },
  ];

  // SMS quota replaces the Téléconsultations card in the KPI grid.
  const smsKpi = {
    label: t("smsThisMonth"),
    value: `${smsUsed} / ${smsLimit}`,
    sublabel: smsLimit > 0
      ? t("smsRemaining", { percent: Math.max(0, Math.round(((smsLimit - smsUsed) / smsLimit) * 100)) })
      : "—",
    accentColor: "bg-violet-500",
    icon: MessageCircle,
    iconBg: "bg-violet-50 text-violet-600",
    href: "/abonnement",
  };

  const teleconsultKpi = hasTeleconsult
    ? {
        label: t("teleconsultMonth"),
        value: teleconsultCount,
        sublabel: t("teleconsultSubLabel"),
        accentColor: "bg-purple-500",
        icon: Video,
        iconBg: "bg-purple-50 text-purple-600",
      }
    : null;

  function getStatusConfig(status: string) {
    const bb = STATUS_BADGE_BORDER[status] ?? {
      badge: "bg-gray-100 text-gray-500",
      border: "border-l-gray-300",
    };
    const label = STATUS_BADGE_BORDER[status]
      ? tStatus(status as Parameters<typeof tStatus>[0])
      : status;
    return { ...bb, label };
  }

  return (
    <div className="space-y-8">
      {/* Verification status banners */}
      {verificationStatus === "pending" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <Shield className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-amber-800">
              {t("verificationPending")}
            </span>
          </div>
          <Link
            href="/verification"
            className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
          >
            {t("verifyAccount")}
          </Link>
        </motion.div>
      )}

      {verificationStatus === "documents_submitted" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-blue-800">
            {t("verificationDocumentsSubmitted")}
          </span>
        </motion.div>
      )}

      {verificationStatus === "rejected" && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl"
        >
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-red-800">
              {t("verificationRejected")}
              {verificationNote ? ` : ${verificationNote}` : "."}
            </span>
          </div>
          <Link
            href="/verification"
            className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-900 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            {t("resubmit")}
          </Link>
        </motion.div>
      )}

      {/* First-login onboarding wizard */}
      <DoctorOnboarding />

      {/* Interactive guided tour — shows after onboarding is dismissed */}
      <GuidedTour
        storageKey="doktori_dashboard_tour"
        steps={[
          {
            target: "[data-tour='kpi-grid']",
            title: t("tourKpiTitle"),
            content: t("tourKpiContent"),
            position: "bottom",
          },
          {
            target: "[data-tour='today-appts']",
            title: t("tourTodayTitle"),
            content: t("tourTodayContent"),
            position: "top",
          },
          {
            target: "[data-tour='upcoming-appts']",
            title: t("tourUpcomingTitle"),
            content: t("tourUpcomingContent"),
            position: "top",
          },
          {
            target: "[data-tour='sidebar-nav']",
            title: t("tourNavTitle"),
            content: t("tourNavContent"),
            position: "right",
          },
        ]}
      />

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="ds-eyebrow">
            {rangeDays === 365
              ? t("rangeEyebrow12M")
              : rangeDays === 90
              ? t("rangeEyebrow3M")
              : t("rangeEyebrow30")}
          </div>
          <h1 className="ds-page-title">
            {t("greeting")}, Dr.{" "}
            <span style={{ color: "var(--primary-600)" }}>{doctorName}</span>
          </h1>
          <p className="ds-page-sub">{t("greetingSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time-range pills — change `rangeDays` server-side via ?range */}
          <div className="ds-tabs">
            <Link
              href="/dashboard?range=30"
              scroll={false}
              className={`ds-tab ${rangeDays === 30 ? "on" : ""}`}
            >
              {t("range30Days")}
            </Link>
            <Link
              href="/dashboard?range=90"
              scroll={false}
              className={`ds-tab ${rangeDays === 90 ? "on" : ""}`}
            >
              {t("range3Months")}
            </Link>
            <Link
              href="/dashboard?range=365"
              scroll={false}
              className={`ds-tab ${rangeDays === 365 ? "on" : ""}`}
            >
              {t("range12Months")}
            </Link>
          </div>
          <Link href="/stats" className="ds-btn ds-btn-ghost">
            <TrendingUp className="h-4 w-4" />
            {t("export")}
          </Link>
          <Link href="/calendrier" className="ds-btn ds-btn-primary">
            <CalendarDays className="h-4 w-4" />
            {t("quickActionMyCalendar")}
          </Link>
          <Link href="/rendez-vous" className="ds-btn ds-btn-ghost">
            {t("quickActionNewAppt")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* ── Day Overview: focused on TODAY's work, top-of-page priority ── */}
      <DayOverviewCard
        todayAppts={todayAppts}
        waitingCount={waitingRoomCount}
        completionRate={completionRate}
      />

      {/* KPI panel — Aujourd'hui / À confirmer / No-shows grouped horizontally
          (same DayOverviewCard pattern). The SMS quota sits as its own card
          beside the panel since it has different semantics (a quota, not a count). */}
      <div data-tour="kpi-grid">
        <KpiPanel kpis={[...kpis, smsKpi]} />
      </div>

      {/* Wallet card */}
      {/* Wallet card removed from dashboard — balance still accessible at /wallet */}

      {/* SMS counter moved into the KPI grid (smsKpi); the duplicate
          SMSCounterCard panel has been removed. */}

      {/* Quick Stats Row removed — replaced by DashboardCharts and the
          Today/Upcoming grid below. */}

      {/* Row 1: Rendez-vous chart + Today + Upcoming side-by-side.
          The Today/Upcoming JSX is rendered just below — we open the grid
          here and close it after the Upcoming card. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardCharts rangeDays={rangeDays} which="appointments" />

      {/* ── Quick Actions Bar removed (replaced by DashboardCharts above) ── */}
      <motion.div
        style={{ display: "none" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            href: "/rendez-vous",
            icon: CalendarPlus,
            label: t("quickActionNewAppt"),
            style: { background: "#0891B2", color: "#fff" },
            hoverClass: "hover:opacity-90",
          },
          {
            href: "/patients",
            icon: UserPlus,
            label: t("quickActionAddPatient"),
            style: {},
            hoverClass: "hover:bg-slate-50 dark:hover:bg-gray-800",
            bordered: true,
          },
          {
            href: "/calendrier",
            icon: CalendarDays,
            label: t("quickActionMyCalendar"),
            style: {},
            hoverClass: "hover:bg-slate-50 dark:hover:bg-gray-800",
            bordered: true,
          },
          {
            href: "/stats",
            icon: BarChart2,
            label: t("quickActionMyStats"),
            style: {},
            hoverClass: "hover:bg-slate-50 dark:hover:bg-gray-800",
            bordered: true,
          },
        ].map(({ href, icon: Icon, label, style, hoverClass, bordered }, i) => (
          <motion.div key={href} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={href}
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center text-xs font-semibold transition-all shadow-sm ${hoverClass} ${
                bordered
                  ? "bg-white border border-[color:var(--line-cool)] text-[color:var(--ink-700)]"
                  : "text-white"
              }`}
              style={style}
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
              {label}
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Waiting room card removed — count surfaced in DayOverviewCard. */}
      <motion.div
        style={{ display: "none" }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        className="rounded-2xl border border-green-100 bg-green-50 dark:bg-green-950/20 dark:border-green-900 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-green-100 dark:border-green-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-green-900 dark:text-green-200 text-sm">
              {t("waitingRoom")}
            </span>
          </div>
          <span className="text-2xl font-black text-green-700 dark:text-green-300 tabular-nums">
            {waitingRoomCount}
          </span>
        </div>
        {waitingPatients.length === 0 ? (
          <div className="px-5 py-4 text-sm text-green-700/60 dark:text-green-400/60">
            {t("noWaitingPatients")}
          </div>
        ) : (
          <div className="divide-y divide-green-100 dark:divide-green-900">
            {waitingPatients.map((p) => {
              const waitMinutes = Math.floor((Date.now() - new Date(p.checkedInAt).getTime()) / 60000);
              return (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-200 dark:bg-green-800 shrink-0">
                      <UserCheck className="h-3.5 w-3.5 text-green-700 dark:text-green-300" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-semibold text-green-900 dark:text-green-100 truncate">
                      {p.patientName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-green-700 dark:text-green-400">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>{t("arrivedAt", { time: format(new Date(p.checkedInAt), "HH:mm") })}</span>
                    {waitMinutes > 0 && (
                      <span className="text-green-600/70 dark:text-green-500/70">
                        ({waitMinutes} min)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Teleconsult promo */}
      {consultationMode === "cabinet" && (
        <div
          className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ animation: "fadeSlideIn 0.5s ease 0.1s both" }}
        >
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
              <Video className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {t("teleconsultPromoTitle")}
              </h3>
              <p className="text-white/80 text-sm mt-1 max-w-md">
                {t("teleconsultPromoDesc")}
              </p>
            </div>
          </div>
          <Link
            href="/teleconsultation"
            className="shrink-0 bg-white text-purple-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            {t("teleconsultPromoCta")}
          </Link>
        </div>
      )}

      {/* Today + Upcoming continue inside the Row-1 grid above */}

      {/* Today's appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        data-tour="today-appts"
        className="ds-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700">
          <SectionHeader>{t("todayAppointments")}</SectionHeader>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-gray-800">
          {todayAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[color:var(--ink-400)]">
              <CheckCircle className="h-8 w-8 mb-2 text-[color:var(--line-strong)]" strokeWidth={1.5} />
              <p className="text-sm">{t("noAppointments")}</p>
            </div>
          ) : (
            todayAppts.map((a) => {
              const cfg = getStatusConfig(a.status);
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between px-5 py-4 border-l-4 ${cfg.border} hover:bg-secondary transition-colors`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[color:var(--ink-900)] flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-primary font-bold tabular-nums">
                        {format(a.startsAt, "HH:mm")}
                      </span>
                      <span className="text-[color:var(--ink-400)]">—</span>
                      {a.patientName}
                      <TypeBadge
                        type={a.type}
                        mode={consultationMode}
                        appointmentId={a.id}
                        videoLabel={t("video")}
                        cabinetLabel={t("cabinet")}
                      />
                    </div>
                    <div className="text-xs text-[color:var(--ink-500)] mt-0.5">
                      {a.patientPhone}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </div>
                  </div>
                  <span className={`ml-4 shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Upcoming appointments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        data-tour="upcoming-appts"
        className="ds-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
          <SectionHeader>{t("upcoming")}</SectionHeader>
          <Link href="/rendez-vous" className="text-xs font-semibold text-primary hover:underline">
            {t("viewAll")} →
          </Link>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-gray-800">
          {upcomingAppts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[color:var(--ink-400)]">
              <Calendar className="h-8 w-8 mb-2 text-[color:var(--line-strong)]" strokeWidth={1.5} />
              <p className="text-sm">{t("noUpcoming")}</p>
            </div>
          ) : (
            upcomingAppts.map((a) => {
              const cfg = getStatusConfig(a.status);
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between px-5 py-4 border-l-4 ${cfg.border} hover:bg-secondary transition-colors`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Timeline dot */}
                    <div className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-primary/50" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[color:var(--ink-900)] flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-[color:var(--ink-500)] font-medium tabular-nums">
                          {format(a.startsAt, "EEE d MMM HH:mm", { locale: fr })}
                        </span>
                        <span className="text-[color:var(--ink-400)]">—</span>
                        {a.patientName}
                        <TypeBadge
                          type={a.type}
                          mode={consultationMode}
                          appointmentId={a.id}
                          videoLabel={t("video")}
                          cabinetLabel={t("cabinet")}
                        />
                      </div>
                      {a.reason && (
                        <div className="text-xs text-[color:var(--ink-500)] mt-0.5">{a.reason}</div>
                      )}
                    </div>
                  </div>
                  <span className={`ml-4 shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      </div> {/* /Row 1: RDV chart + Today + Upcoming */}

      {/* Row 2: Recettes + Taux d'annulation */}
      <DashboardCharts rangeDays={rangeDays} which="revenue" />

      {/* ── Recent Activity Feed ────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="ds-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700">
            <SectionHeader>{t("recentActivity")}</SectionHeader>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-gray-800">
            {recentActivity.map((item, i) => {
              const { text, dot } = activityLabel(item, t);
              const updatedDate = new Date(item.updatedAt);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.55 + i * 0.06 }}
                  className="flex items-start gap-3 px-5 py-3.5"
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[color:var(--ink-700)] leading-snug">{text}</p>
                    <p className="text-xs text-[color:var(--ink-400)] mt-0.5">
                      {format(updatedDate, "d MMM à HH:mm", { locale: fr })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
