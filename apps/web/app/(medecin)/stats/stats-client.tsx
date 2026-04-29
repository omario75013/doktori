"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck2,
  TrendingUp,
  DollarSign,
  Clock,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthlyRow = {
  month: string;
  total: number;
  completed: number;
  cancelled: number;
  no_shows: number;
};

export type PeakRow = { hour: number; count: number };
export type ReasonRow = { reason: string; count: number };

export type StatsClientProps = {
  monthly: MonthlyRow[];
  peaks: PeakRow[];
  reasons: ReasonRow[];
  totalThisMonth: number;
  confirmationRate: number;
  noShowRate: number;
  revenueProjection: number;
  feeInDT: number;
  confirmedCount: number;
  newPatients: number;
  returningPatients: number;
};

// ─── Palette ──────────────────────────────────────────────────────────────────

const TEAL = "#0891B2";
const DARK = "#134E4A";
const BG_LIGHT = "#F0FDFA";
const TEAL_MID = "#0E7490";
const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const PURPLE = "#7C3AED";
const RED = "#DC2626";
const DONUT_COLORS = [GREEN, RED, ORANGE];

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-6 w-1 rounded-full bg-primary" />
      <div>
        <h2 className="font-semibold text-foreground text-base">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function DoktoriTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-3 text-sm min-w-[140px]">
      {label && <p className="font-semibold text-foreground mb-2">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-gray-500">{entry.name}</span>
          <span className="ml-auto font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiColor = "teal" | "green" | "orange" | "red" | "purple";

const kpiColorMap: Record<KpiColor, { text: string; bg: string; iconBg: string }> = {
  teal:   { text: "text-primary", bg: "bg-secondary", iconBg: "bg-[#CFFAFE]" },
  green:  { text: "text-green-600",  bg: "bg-green-50",  iconBg: "bg-green-100" },
  orange: { text: "text-orange-600", bg: "bg-orange-50", iconBg: "bg-orange-100" },
  red:    { text: "text-red-600",    bg: "bg-red-50",    iconBg: "bg-red-100" },
  purple: { text: "text-purple-600", bg: "bg-purple-50", iconBg: "bg-purple-100" },
};

function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
  index,
}: {
  label: string;
  value: string;
  sub: string;
  color: KpiColor;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
}) {
  const c = kpiColorMap[color];
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1.5 ${c.text}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Monthly chart ────────────────────────────────────────────────────────────

function MonthlyChart({ monthly }: { monthly: MonthlyRow[] }) {
  const t = useTranslations("medecin.stats");
  const data = monthly.map((r) => ({
    name: formatMonth(r.month),
    Complétés: r.completed,
    Annulés: r.cancelled,
    Absences: r.no_shows,
  }));

  return (
    <motion.div
      custom={4}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <SectionHeader title={t("monthlyTitle")} subtitle={t("monthlySubtitle")} />
      {monthly.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap="30%" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0FDFA" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<DoktoriTooltip />} cursor={{ fill: "#F0FDFA" }} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="Complétés" name={t("completed")} fill={GREEN} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Annulés" name={t("cancelled")} fill={RED} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Absences" name={t("noShows")} fill={ORANGE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}

// ─── Peak hours area chart ────────────────────────────────────────────────────

function PeakHoursChart({ peaks }: { peaks: PeakRow[] }) {
  const t = useTranslations("medecin.stats");
  const data = Array.from({ length: 24 }, (_, h) => {
    const found = peaks.find((p) => p.hour === h);
    return { hour: `${h}h`, rdv: found?.count ?? 0 };
  });

  const busiest = peaks.length > 0
    ? peaks.reduce((a, b) => (a.count > b.count ? a : b))
    : null;

  return (
    <motion.div
      custom={5}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <SectionHeader title={t("peakHoursTitle")} subtitle={t("peakHoursSubtitle")} />
      {peaks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TEAL} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0FDFA" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-border rounded-xl shadow-lg px-3 py-2 text-sm">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-primary">{payload[0].value} {t("appointmentShort")}</p>
                    </div>
                  );
                }}
                cursor={false}
              />
              <Area
                type="monotone"
                dataKey="rdv"
                stroke={TEAL}
                strokeWidth={2}
                fill="url(#peakGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          {busiest && (
            <p className="mt-3 text-xs text-gray-500">
              {t("busiestSlotLabel")}{" "}
              <span className="font-semibold text-foreground">{busiest.hour}h</span>
              {" "}avec{" "}
              <span className="font-semibold text-foreground">{busiest.count}</span>{" "}{t("appointmentShort")}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Status donut chart ───────────────────────────────────────────────────────

function StatusDonut({ monthly }: { monthly: MonthlyRow[] }) {
  const t = useTranslations("medecin.stats");
  const totals = monthly.reduce(
    (acc, r) => ({
      completed: acc.completed + r.completed,
      cancelled: acc.cancelled + r.cancelled,
      no_shows: acc.no_shows + r.no_shows,
    }),
    { completed: 0, cancelled: 0, no_shows: 0 },
  );

  const data = [
    { name: t("completed"), value: totals.completed },
    { name: t("cancelled"), value: totals.cancelled },
    { name: t("noShows"), value: totals.no_shows },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      custom={6}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <SectionHeader title={t("statusDistributionTitle")} subtitle={t("statusDistributionSubtitle")} />
      {total === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0];
                  const pct = total > 0 ? Math.round(((entry.value as number) / total) * 100) : 0;
                  return (
                    <div className="bg-white border border-border rounded-xl shadow-lg px-3 py-2 text-sm">
                      <p className="font-semibold text-foreground">{entry.name}</p>
                      <p className="text-gray-500">{entry.value} ({pct}%)</p>
                    </div>
                  );
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 -mt-2">{total} {t("totalAppointments")}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Patient type bars ────────────────────────────────────────────────────────

function PatientTypeSection({
  newPatients,
  returningPatients,
}: {
  newPatients: number;
  returningPatients: number;
}) {
  const t = useTranslations("medecin.stats");
  const total = newPatients + returningPatients;

  return (
    <motion.div
      custom={7}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <SectionHeader title={t("patientsTitle")} subtitle={t("patientsSubtitle")} />
      {total === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          <AnimatedBar
            label={t("newPatientsLabel")}
            count={newPatients}
            total={total}
            colorClass="bg-primary"
          />
          <AnimatedBar
            label={t("returningPatientsLabel")}
            count={returningPatients}
            total={total}
            colorClass="bg-foreground"
          />
          <div className="flex gap-6 pt-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
              <span className="text-gray-500">
                <span className="font-semibold text-foreground">{newPatients}</span> {t("newSuffix")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-foreground inline-block" />
              <span className="text-gray-500">
                <span className="font-semibold text-foreground">{returningPatients}</span> {t("returningSuffix")}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AnimatedBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-gray-500">
          {count} <span className="text-gray-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colorClass} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ─── Top reasons ──────────────────────────────────────────────────────────────

function TopReasons({ reasons }: { reasons: ReasonRow[] }) {
  const t = useTranslations("medecin.stats");
  const max = reasons.reduce((m, r) => Math.max(m, r.count), 1);
  const rankColors = [TEAL, TEAL_MID, "#0C6B88", "#0A5E78", "#085369"];

  return (
    <motion.div
      custom={8}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <SectionHeader title={t("topReasonsTitle")} subtitle={t("topReasonsSubtitle")} />
      {reasons.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="space-y-3">
          {reasons.map((r, i) => (
            <li key={i} className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: rankColors[i] ?? TEAL }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-foreground font-medium truncate flex-1"
                  title={r.reason}
                >
                  {r.reason}
                </span>
                <span className="text-gray-500 shrink-0 ml-2 tabular-nums">{r.count}</span>
              </div>
              <div className="ml-7 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: rankColors[i] ?? TEAL }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((r.count / max) * 100)}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 * i + 0.3 }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const t = useTranslations("medecin.stats");
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
      <Activity className="h-10 w-10 mb-3" />
      <p className="text-sm">{t("noData")}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS: Record<number, string> = {
  0: "Jan", 1: "Fév", 2: "Mar", 3: "Avr",
  4: "Mai", 5: "Juin", 6: "Juil", 7: "Août",
  8: "Sep", 9: "Oct", 10: "Nov", 11: "Déc",
};

function formatMonth(isoDate: string) {
  const d = new Date(isoDate);
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function StatsClient({
  monthly,
  peaks,
  reasons,
  totalThisMonth,
  confirmationRate,
  noShowRate,
  revenueProjection,
  feeInDT,
  confirmedCount,
  newPatients,
  returningPatients,
}: StatsClientProps) {
  const t = useTranslations("medecin.stats");
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          index={0}
          label={t("appointmentsThisMonth")}
          value={String(totalThisMonth)}
          sub={t("appointmentsThisMonthSub")}
          color="teal"
          icon={CalendarCheck2}
        />
        <KpiCard
          index={1}
          label={t("completionRateLabel")}
          value={`${confirmationRate}%`}
          sub={t("completionRateSub")}
          color="green"
          icon={TrendingUp}
        />
        <KpiCard
          index={2}
          label={t("noShowRateLabel")}
          value={`${noShowRate}%`}
          sub={t("noShowRateSub")}
          color={noShowRate > 20 ? "red" : "orange"}
          icon={Users}
        />
        <KpiCard
          index={3}
          label={t("estimatedRevenueLabel")}
          value={feeInDT > 0 ? `${revenueProjection.toFixed(0)} DT` : "—"}
          sub={
            feeInDT > 0
              ? `${confirmedCount} ${t("appointmentShort")} × ${feeInDT} DT`
              : t("noFeeSet")
          }
          color="purple"
          icon={DollarSign}
        />
      </div>

      {/* Monthly stacked bar chart */}
      <MonthlyChart monthly={monthly} />

      {/* Two-column: donut + patient types */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusDonut monthly={monthly} />
        <PatientTypeSection newPatients={newPatients} returningPatients={returningPatients} />
      </div>

      {/* Two-column: top reasons + peak hours */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopReasons reasons={reasons} />
        <PeakHoursChart peaks={peaks} />
      </div>
    </div>
  );
}
