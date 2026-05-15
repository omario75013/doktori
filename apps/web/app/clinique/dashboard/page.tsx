"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  UserX,
  Clock,
  DollarSign,
  Shield,
  UserPlus,
  RefreshCw,
  CalendarPlus,
  UserRoundPlus,
  MessageSquare,
  FileText,
  Phone,
  ChevronRight,
  Bell,
  Cake,
  AlertTriangle,
  FlaskConical,
  FileWarning,
  MailOpen,
  ScanLine,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarCheck2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  clinic: { id: string; name: string; city: string; plan: string; slug: string };
  generatedAt: string;
  kpis: {
    rdvToday: { value: number; deltaVsLastWeek: number };
    noShowRate: { value: number; target: number; trend: "up" | "down" | "flat" };
    avgWaitMinutes: { value: number; deltaVsYesterday: number };
    revenueToday: { valueMillimes: number; deltaPct: number };
    cnamPending: { count: number; totalMillimes: number };
    newPatientsToday: { value: number; deltaVsLastWeek: number };
  };
  pipeline: { attendus: number; arrives: number; enConsultation: number; termines: number };
  inbox: { labsUnread: number; cnamRejected: number; pendingInvites: number; docsToValidate: number; labsAwaitingResults?: number };
  alerts: {
    birthdaysToday: Array<{ patientId: string; name: string; age: number }>;
    doctorsRunningLate: Array<{ doctorId: string; name: string; minutesLate: number }>;
    smsCreditLow: boolean;
    doctorsOffToday: Array<{ doctorId: string; name: string }>;
  };
  miniCharts: {
    rdv7d: Array<{ date: string; count: number }>;
    revenue30d: Array<{ date: string; valueMillimes: number }>;
    topMotifs: Array<{ motif: string; count: number; pct: number }>;
  };
  occupancy: {
    doctors: Array<{
      doctorId: string;
      name: string;
      specialty: string;
      cells: Array<{ day: number; hour: number; bookedCount: number; capacity: number }>;
      todayPct: number;
    }>;
  };
  forecast: { rdvConfirmed: number; revenueEstMillimes: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMillimes(m: number): string {
  const dt = Math.floor(m / 1000);
  return dt.toLocaleString("fr-TN").replace(/,/g, " ") + " DT";
}

function formatDelta(n: number, isPercent = false): string {
  if (n === 0) return "=";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${isPercent ? "%" : ""}`;
}

function deltaColor(n: number, invertPositive = false): string {
  if (n === 0) return "text-muted-foreground";
  const positive = invertPositive ? n < 0 : n > 0;
  return positive ? "text-emerald-600" : "text-red-500";
}

function DeltaChip({
  value,
  isPercent = false,
  invertPositive = false,
  label = "",
}: {
  value: number;
  isPercent?: boolean;
  invertPositive?: boolean;
  label?: string;
}) {
  const color = deltaColor(value, invertPositive);
  const text = formatDelta(value, isPercent);
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${color}`}>
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {text}{label ? ` ${label}` : ""}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border animate-pulse h-28" />
  );
}

function SkeletonBlock({ h = "h-40" }: { h?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-border animate-pulse ${h}`} />
  );
}

// ---------------------------------------------------------------------------
// KPI Card (extended)
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  subValue,
  delta,
  deltaLabel,
  isPercent,
  invertPositiveDelta,
  icon: Icon,
  iconColor,
  accentClass,
  href,
  index,
}: {
  label: string;
  value: string;
  subValue?: string;
  delta?: number;
  deltaLabel?: string;
  isPercent?: boolean;
  invertPositiveDelta?: boolean;
  icon: React.ElementType;
  iconColor: string;
  accentClass: string;
  href?: string;
  index: number;
}) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.06 + index * 0.06 }}
      onClick={() => href && router.push(href)}
      className={`relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden ${href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentClass}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-black mt-1.5 text-foreground tabular-nums">{value}</div>
          {subValue && (
            <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
          )}
          {delta !== undefined && (
            <div className="mt-1">
              <DeltaChip value={delta} isPercent={!!isPercent} label={deltaLabel} invertPositive={invertPositiveDelta} />
            </div>
          )}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${iconColor}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Quick action button
// ---------------------------------------------------------------------------

function QuickBtn({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-semibold text-foreground"
      style={{ borderColor: `${color}40` }}
    >
      <div
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-4 w-4" style={{ color }} strokeWidth={2.5} />
      </div>
      <span>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pipeline kanban bucket
// ---------------------------------------------------------------------------

function PipelineBucket({
  label,
  count,
  colorClass,
  bgClass,
  href,
}: {
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
  href: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="flex-1 min-w-[80px] rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-all text-start"
    >
      <div className={`h-1.5 rounded-full ${bgClass}`} />
      <div className={`text-3xl font-black tabular-nums ${colorClass}`}>{count}</div>
      <div className="text-xs font-semibold text-muted-foreground leading-tight">{label}</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inbox row
// ---------------------------------------------------------------------------

function InboxRow({
  icon: Icon,
  iconColor,
  label,
  count,
  href,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  count: number;
  href: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors w-full text-start"
    >
      <div
        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl"
        style={{ background: `${iconColor}18` }}
      >
        <Icon className="h-4 w-4" style={{ color: iconColor }} strokeWidth={2.5} />
      </div>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {count > 0 && (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ background: iconColor }}
        >
          {count}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Occupancy cell
// ---------------------------------------------------------------------------

function OccCell({
  bookedCount,
  capacity,
  isToday,
}: {
  bookedCount: number;
  capacity: number;
  isToday: boolean;
}) {
  const pct = capacity > 0 ? Math.min(1, bookedCount / capacity) : 0;
  const title = `${bookedCount}/${capacity}`;
  return (
    <div
      title={title}
      className={`h-5 w-full rounded-sm ${isToday ? "ring-2 ring-cyan-400" : ""}`}
      style={{ background: `rgba(8,145,178,${0.15 + pct * 0.7})` }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClinicDashboardPage() {
  const { data: session, status } = useSession();
  const t = useTranslations("clinique.dashboard");
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/clinique/dashboard/overview");
      if (!res.ok) return;
      const json = await res.json() as DashboardData;
      setData(json);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("[dashboard] fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchData();

    // Auto-refresh every 60s when tab visible
    timerRef.current = setInterval(() => {
      if (!document.hidden) void fetchData();
    }, 60_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonBlock h="h-16" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonBlock h="h-52" />
          <SkeletonBlock h="h-52" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonBlock h="h-52" />
          <SkeletonBlock h="h-80" />
        </div>
        <SkeletonBlock h="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const { kpis, pipeline, inbox, alerts, miniCharts, occupancy, forecast } = data;
  const noDoctors = occupancy.doctors.length === 0;
  const todayDow = (new Date().getDay() + 6) % 7; // 0=Mon

  const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Total inbox count
  const totalInbox =
    inbox.labsUnread + inbox.cnamRejected + inbox.pendingInvites + inbox.docsToValidate + (inbox.labsAwaitingResults ?? 0);

  // Total alerts count
  const totalAlerts =
    alerts.birthdaysToday.length +
    alerts.doctorsRunningLate.length +
    alerts.doctorsOffToday.length +
    (alerts.smsCreditLow ? 1 : 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-black text-foreground">
            {t("title")} —{" "}
            <span style={{ color: "#0891B2" }}>{data.clinic.name}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("fr-TN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {lastRefresh && (
              <span className="ml-2 text-xs opacity-60">
                · {t("refresh")} {lastRefresh.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); void fetchData(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors self-start"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </button>
      </motion.div>

      {/* ── Empty state (no doctors) ──────────────────────────────────────── */}
      {noDoctors ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-10 text-center"
        >
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <div className="text-lg font-bold text-foreground mb-1">{t("empty.noDoctors")}</div>
          <button
            onClick={() => router.push("/clinique/doctors")}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#0891B2" }}
          >
            {t("empty.addFirstDoctor")}
          </button>
        </motion.div>
      ) : (
        <>
          {/* ── KPI Row ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard
              index={0}
              label={t("kpi.rdvToday")}
              value={String(kpis.rdvToday.value)}
              delta={kpis.rdvToday.deltaVsLastWeek}
              deltaLabel={t("kpi.vsLastWeek")}
              icon={CalendarDays}
              iconColor="#0891B2"
              accentClass="bg-cyan-500"
              href="/clinique/rendez-vous"
            />
            <KpiCard
              index={1}
              label={t("kpi.noShow")}
              value={`${kpis.noShowRate.value}%`}
              subValue={`${t("kpi.target")}: ${kpis.noShowRate.target}%`}
              delta={kpis.noShowRate.trend === "flat" ? 0 : kpis.noShowRate.trend === "up" ? 1 : -1}
              invertPositiveDelta
              icon={UserX}
              iconColor="#ef4444"
              accentClass="bg-red-400"
              href="/clinique/rendez-vous"
            />
            <KpiCard
              index={2}
              label={t("kpi.wait")}
              value={`${kpis.avgWaitMinutes.value} min`}
              delta={kpis.avgWaitMinutes.deltaVsYesterday}
              deltaLabel={t("kpi.vsYesterday")}
              invertPositiveDelta
              icon={Clock}
              iconColor="#f59e0b"
              accentClass="bg-amber-400"
              href="/clinique/salle-attente"
            />
            <KpiCard
              index={3}
              label={t("kpi.revenue")}
              value={formatMillimes(kpis.revenueToday.valueMillimes)}
              delta={kpis.revenueToday.deltaPct}
              deltaLabel={t("kpi.vsYesterday")}
              isPercent
              icon={DollarSign}
              iconColor="#10b981"
              accentClass="bg-emerald-500"
              href="/clinique/finance"
            />
            <KpiCard
              index={4}
              label={t("kpi.cnam")}
              value={String(kpis.cnamPending.count)}
              subValue={kpis.cnamPending.count > 0 ? formatMillimes(kpis.cnamPending.totalMillimes) : undefined}
              icon={Shield}
              iconColor="#3b82f6"
              accentClass="bg-blue-500"
              href="/clinique/cnam"
            />
            <KpiCard
              index={5}
              label={t("kpi.newPatients")}
              value={String(kpis.newPatientsToday.value)}
              delta={kpis.newPatientsToday.deltaVsLastWeek}
              deltaLabel={t("kpi.vsLastWeek")}
              icon={UserPlus}
              iconColor="#8b5cf6"
              accentClass="bg-violet-500"
              href="/clinique/patients"
            />
          </div>

          {/* ── Quick Actions ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3"
          >
            <QuickBtn
              icon={CalendarPlus}
              label={t("quickActions.newRdv")}
              color="#0891B2"
              onClick={() => router.push("/clinique/rendez-vous?action=new")}
            />
            <QuickBtn
              icon={UserRoundPlus}
              label={t("quickActions.newPatient")}
              color="#8b5cf6"
              onClick={() => router.push("/clinique/patients?action=new")}
            />
            <QuickBtn
              icon={MessageSquare}
              label={t("quickActions.smsRappel")}
              color="#f59e0b"
              onClick={() => router.push("/clinique/communication")}
            />
            <QuickBtn
              icon={FileText}
              label={t("quickActions.internalNote")}
              color="#10b981"
              onClick={() => router.push("/clinique/notes")}
            />
            <QuickBtn
              icon={Phone}
              label={t("quickActions.recallHta")}
              color="#ef4444"
              onClick={() => router.push("/clinique/communication?filter=hta")}
            />
          </motion.div>

          {/* ── Two-col: Pipeline + Inbox ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline kanban */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
            >
              <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">
                {t("pipeline.title")}
              </h2>
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <PipelineBucket
                  label={t("pipeline.attendus")}
                  count={pipeline.attendus}
                  colorClass="text-amber-500"
                  bgClass="bg-amber-400"
                  href="/clinique/rendez-vous?filter=pending"
                />
                <PipelineBucket
                  label={t("pipeline.arrives")}
                  count={pipeline.arrives}
                  colorClass="text-blue-500"
                  bgClass="bg-blue-400"
                  href="/clinique/rendez-vous?filter=checked_in"
                />
                <PipelineBucket
                  label={t("pipeline.enConsultation")}
                  count={pipeline.enConsultation}
                  colorClass="text-violet-600"
                  bgClass="bg-violet-500"
                  href="/clinique/rendez-vous?filter=in_consultation"
                />
                <PipelineBucket
                  label={t("pipeline.termines")}
                  count={pipeline.termines}
                  colorClass="text-emerald-600"
                  bgClass="bg-emerald-500"
                  href="/clinique/rendez-vous?filter=completed"
                />
              </div>
            </motion.div>

            {/* Inbox */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
            >
              <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                {t("inbox.title")}
                {totalInbox > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-red-500">
                    {totalInbox}
                  </span>
                )}
              </h2>
              <div className="space-y-1">
                <InboxRow
                  icon={FlaskConical}
                  iconColor="#0891B2"
                  label={t("inbox.labsUnread")}
                  count={inbox.labsUnread}
                  href="/clinique/labos"
                />
                <InboxRow
                  icon={FileWarning}
                  iconColor="#ef4444"
                  label={t("inbox.cnamRejected")}
                  count={inbox.cnamRejected}
                  href="/clinique/cnam?filter=rejected"
                />
                <InboxRow
                  icon={MailOpen}
                  iconColor="#8b5cf6"
                  label={t("inbox.pendingInvites")}
                  count={inbox.pendingInvites}
                  href="/clinique/doctors"
                />
                <InboxRow
                  icon={FileText}
                  iconColor="#f59e0b"
                  label={t("inbox.docsToValidate")}
                  count={inbox.docsToValidate}
                  href="/clinique/labos"
                />
                {(inbox.labsAwaitingResults ?? 0) > 0 && (
                  <InboxRow
                    icon={ScanLine}
                    iconColor="#7C3AED"
                    label={t("inbox.labsAwaitingResults")}
                    count={inbox.labsAwaitingResults ?? 0}
                    href="/clinique/labos?tab=received"
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Two-col: Alerts + Mini-charts ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
            >
              <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                {t("alerts.title")}
                {totalAlerts > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-amber-500">
                    {totalAlerts}
                  </span>
                )}
              </h2>

              {totalAlerts === 0 ? (
                <p className="text-sm text-muted-foreground">{t("alerts.none")}</p>
              ) : (
                <div className="space-y-2">
                  {alerts.birthdaysToday.map((b) => (
                    <div key={b.patientId} className="flex items-center gap-2 text-sm">
                      <Cake className="h-4 w-4 text-pink-500 shrink-0" />
                      <span className="text-foreground font-medium">{b.name}</span>
                      <span className="text-muted-foreground">— {b.age} ans</span>
                    </div>
                  ))}
                  {alerts.doctorsRunningLate.map((d) => (
                    <div key={d.doctorId} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-foreground font-medium">{d.name}</span>
                      <span className="text-muted-foreground">— {d.minutesLate} min de retard</span>
                    </div>
                  ))}
                  {alerts.doctorsOffToday.map((d) => (
                    <div key={d.doctorId} className="flex items-center gap-2 text-sm">
                      <CalendarCheck2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-foreground font-medium">{d.name}</span>
                      <span className="text-muted-foreground">— congé aujourd&apos;hui</span>
                    </div>
                  ))}
                  {alerts.smsCreditLow && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="text-foreground">{t("alerts.smsCreditLow")}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Mini charts stacked */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5 space-y-5"
            >
              {/* RDV 7d bar */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("charts.rdv7d")}
                </div>
                {miniCharts.rdv7d.length === 0 ? (
                  <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">
                    Aucune donnée
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={72}>
                    <BarChart data={miniCharts.rdv7d} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <Bar dataKey="count" fill="#0891B2" radius={[3, 3, 0, 0]} />
                      <Tooltip
                        formatter={(v: unknown) => [`${v}`, "RDV"]}
                        contentStyle={{ borderRadius: "10px", fontSize: "11px", border: "1px solid #e2e8f0" }}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => d.slice(5)}
                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Revenue 30d area */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("charts.revenue30d")}
                </div>
                {miniCharts.revenue30d.every((r) => r.valueMillimes === 0) ? (
                  <div className="h-20 flex items-center justify-center text-muted-foreground text-xs">
                    Aucune donnée
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={72}>
                    <AreaChart data={miniCharts.revenue30d} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="valueMillimes"
                        stroke="#0F766E"
                        strokeWidth={2}
                        fill="url(#revGrad)"
                        dot={false}
                      />
                      <Tooltip
                        formatter={(v: unknown) => [formatMillimes(Number(v)), "CA"]}
                        contentStyle={{ borderRadius: "10px", fontSize: "11px", border: "1px solid #e2e8f0" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top motifs horizontal bars */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("charts.topMotifs")}
                </div>
                {miniCharts.topMotifs.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Aucun motif enregistré</div>
                ) : (
                  <div className="space-y-2">
                    {miniCharts.topMotifs.map((m, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="font-medium text-foreground capitalize truncate max-w-[65%]">
                            {m.motif}
                          </span>
                          <span className="text-muted-foreground tabular-nums">{m.pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${m.pct}%`,
                              background: ["#0891B2", "#7c3aed", "#f59e0b", "#10b981", "#ef4444"][i % 5],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Occupancy heatmap ─────────────────────────────────────────── */}
          {occupancy.doctors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.45 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5 overflow-x-auto"
            >
              <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">
                {t("occupancy.title")}
              </h2>

              {/* Day headers */}
              <div className="min-w-[520px]">
                <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1">
                  <div />
                  {DAY_LABELS.map((d, i) => (
                    <div
                      key={d}
                      className={`text-center text-xs font-semibold ${i === todayDow ? "text-cyan-600" : "text-muted-foreground"}`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {occupancy.doctors.map((doc) => {
                  // Build cell lookup: day -> max pct (across hours)
                  const dayMax = new Map<number, { bookedCount: number; capacity: number }>();
                  for (const cell of doc.cells) {
                    const prev = dayMax.get(cell.day);
                    const prevCount = prev?.bookedCount ?? 0;
                    if (cell.bookedCount > prevCount) {
                      dayMax.set(cell.day, { bookedCount: cell.bookedCount, capacity: cell.capacity });
                    }
                  }

                  return (
                    <div key={doc.doctorId} className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1 items-center">
                      <div className="text-xs font-medium text-foreground truncate pr-2">
                        {doc.name.split(" ").slice(-1)[0]}
                        <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                          {Math.round(doc.todayPct * 100)}%
                        </span>
                      </div>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                        const cell = dayMax.get(day);
                        return (
                          <OccCell
                            key={day}
                            bookedCount={cell?.bookedCount ?? 0}
                            capacity={cell?.capacity ?? 2}
                            isToday={day === todayDow}
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {/* Legend */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">{t("occupancy.legend")}:</span>
                  {[0.15, 0.5, 0.85].map((pct, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div
                        className="h-3 w-6 rounded-sm"
                        style={{ background: `rgba(8,145,178,${0.15 + pct * 0.7})` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {i === 0 ? "Faible" : i === 1 ? "Moyen" : "Chargé"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Forecast strip ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="rounded-2xl text-white p-4 flex flex-wrap items-center gap-4"
            style={{ background: "linear-gradient(135deg, #0891B2 0%, #0F766E 100%)" }}
          >
            <TrendingUp className="h-6 w-6 shrink-0 opacity-80" />
            <div>
              <div className="text-sm font-bold opacity-80">{t("forecast.title")}</div>
              <div className="text-lg font-black">
                {t("forecast.rdvConfirmed")}:{" "}
                <span className="tabular-nums">{forecast.rdvConfirmed} RDV</span>
                {" · "}
                {t("forecast.revenueExpected")}:{" "}
                <span className="tabular-nums">{formatMillimes(forecast.revenueEstMillimes)}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
