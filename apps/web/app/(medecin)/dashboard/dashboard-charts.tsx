"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Point {
  bucket: string;
  total: number;
  completed: number;
  cancelled: number;
  income: number;
  cancellationRate: number;
}

const CYAN = "#0F7B8A";
const CYAN_SOFT = "#5BAEBB";
const ROSE = "#E11D48";
const MINT = "#10B981";

function formatBucket(b: string, granularity: string) {
  const d = new Date(b);
  if (granularity === "month") {
    return d.toLocaleDateString("fr-FR", { month: "short" });
  }
  if (granularity === "week") {
    return "S" + Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
  }
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function DashboardCharts({
  rangeDays,
  which = "all",
}: {
  rangeDays: number;
  /** "appointments" → only the RDV chart card.
   *  "revenue" → only Recettes + Taux d'annulation.
   *  "all" → all three (default). */
  which?: "appointments" | "revenue" | "all";
}) {
  const t = useTranslations("medecin.dashboard");
  const [points, setPoints] = useState<Point[]>([]);
  const [granularity, setGranularity] = useState<string>("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/doctor/dashboard-charts?range=${rangeDays}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { points: [], granularity: "day" }))
      .then((d) => {
        setPoints(Array.isArray(d.points) ? d.points : []);
        setGranularity(d.granularity ?? "day");
      })
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [rangeDays]);

  const data = points.map((p) => ({
    ...p,
    label: formatBucket(p.bucket, granularity),
  }));

  const avgCancellation =
    data.length > 0
      ? Math.round(
          data.reduce((s, p) => s + p.cancellationRate, 0) / data.length,
        )
      : 0;

  const totalRdv = data.reduce((s, p) => s + p.total, 0);
  const totalIncome = data.reduce((s, p) => s + p.income, 0);

  return (
    <div
      className={`grid grid-cols-1 gap-4 ${
        which === "appointments"
          ? ""
          : which === "revenue"
          ? "lg:grid-cols-2"
          : "lg:grid-cols-3"
      }`}
    >
      {which !== "revenue" && (
      <ChartCard
        title={t("chartAppointments")}
        value={totalRdv.toString()}
        sub={t("chartAppointmentsSub")}
        tone="primary"
      >
        {loading ? (
          <Skeleton />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6F1F4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                cursor={{ fill: "#F0FDFA" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #DDE5EF",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="total" fill={CYAN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      )}

      {which !== "appointments" && (
      <ChartCard
        title={t("chartRevenue")}
        value={`${Math.round(totalIncome)} DT`}
        sub={t("chartRevenueSub")}
        tone="mint"
      >
        {loading ? (
          <Skeleton />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MINT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={MINT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECFDF5" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                cursor={{ stroke: MINT, strokeWidth: 1 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #DDE5EF",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke={MINT}
                strokeWidth={2}
                fill="url(#incomeFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      )}

      {which !== "appointments" && (
      <ChartCard
        title={t("chartCancellation")}
        value={`${avgCancellation}%`}
        sub={t("chartCancellationSub")}
        tone="rose"
      >
        {loading ? (
          <Skeleton />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FEE2E2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                width={28}
                unit="%"
              />
              <Tooltip
                cursor={{ stroke: ROSE, strokeWidth: 1 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #DDE5EF",
                  fontSize: 12,
                }}
                formatter={(v: number) => `${v}%`}
              />
              <Line
                type="monotone"
                dataKey="cancellationRate"
                stroke={ROSE}
                strokeWidth={2}
                dot={{ r: 2, fill: ROSE }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div
      className="rounded-xl"
      style={{ height: 180, background: "var(--surface-2)" }}
    />
  );
}

function ChartCard({
  title,
  value,
  sub,
  tone,
  children,
}: {
  title: string;
  value: string;
  sub: string;
  tone: "primary" | "mint" | "rose";
  children: React.ReactNode;
}) {
  const toneStyle =
    tone === "rose"
      ? { background: "#FEE2E2", color: "#9F1239" }
      : tone === "mint"
      ? { background: "#D1FAE5", color: "#065F46" }
      : { background: "var(--primary-50)", color: "var(--primary-700)" };

  return (
    <div className="ds-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider"
            style={toneStyle}
          >
            {title}
          </div>
          <div
            className="text-[22px] font-extrabold leading-none mt-2 tabular-nums"
            style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
          >
            {value}
          </div>
          <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-500)" }}>
            {sub}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
