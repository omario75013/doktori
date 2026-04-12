"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  Smartphone,
  Users,
  Activity,
  TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Totals = {
  total_events: string;
  unique_users: string;
  app_opens: string;
};

type PlatformRow = { platform: string; count: string; users: string };
type VersionRow = { app_version: string; platform: string; count: string; users: string };
type EventRow = { event: string; count: string };
type DailyRow = { day: string; events: string; users: string };

type AnalyticsData = {
  totals: Totals;
  byPlatform: PlatformRow[];
  byVersion: VersionRow[];
  byEvent: EventRow[];
  daily: DailyRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDay(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function num(v: string | number | undefined) {
  return Number(v ?? 0).toLocaleString("fr-FR");
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <div
          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MobileAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useSWR<AnalyticsData>(
    `/api/admin/analytics/mobile?days=${days}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const iosCount = data?.byPlatform.find((r) => r.platform === "ios")?.count ?? "0";
  const androidCount =
    data?.byPlatform.find((r) => r.platform === "android")?.count ?? "0";

  const dailySeries = (data?.daily ?? []).map((r) => ({
    day: r.day,
    events: Number(r.events),
    users: Number(r.users),
  }));

  const eventSeries = (data?.byEvent ?? []).map((r) => ({
    event: r.event,
    count: Number(r.count),
  }));

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics mobile</h1>
          <p className="text-slate-500 mt-1">
            Utilisation de l'application iOS / Android
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d}j
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Événements total"
          value={isLoading ? "—" : num(data?.totals.total_events)}
          icon={Activity}
          accent="from-teal-500 to-teal-600"
        />
        <KpiCard
          label="Utilisateurs uniques"
          value={isLoading ? "—" : num(data?.totals.unique_users)}
          icon={Users}
          accent="from-blue-500 to-blue-600"
        />
        <KpiCard
          label="Ouvertures app"
          value={isLoading ? "—" : num(data?.totals.app_opens)}
          icon={TrendingUp}
          accent="from-indigo-500 to-indigo-600"
        />
        <KpiCard
          label="iOS vs Android"
          value={isLoading ? "—" : `${num(iosCount)} / ${num(androidCount)}`}
          icon={Smartphone}
          accent="from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily active users line chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Activité quotidienne
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Événements et utilisateurs actifs par jour
          </p>
          <div className="h-56">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Chargement…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dailySeries}
                  margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tickFormatter={formatDay}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                    }}
                    labelFormatter={(v) =>
                      new Date(v as string).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke="#0891B2"
                    strokeWidth={2}
                    dot={false}
                    name="Événements"
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={false}
                    name="Utilisateurs"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              Événements
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Utilisateurs
            </span>
          </div>
        </div>

        {/* Events by type bar chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Événements par type
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Volume d'événements pour la période sélectionnée
          </p>
          <div className="h-56">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Chargement…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={eventSeries}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 60, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="event"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#0891B2" radius={[0, 4, 4, 0]} name="Nombre" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Version distribution table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Distribution des versions
        </h2>
        {isLoading ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3 pr-4 font-medium">Version</th>
                  <th className="pb-3 pr-4 font-medium">Plateforme</th>
                  <th className="pb-3 pr-4 font-medium text-right">Événements</th>
                  <th className="pb-3 font-medium text-right">Utilisateurs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.byVersion ?? []).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-4 font-mono font-medium text-slate-800">
                      {row.app_version}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          row.platform === "ios"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {row.platform === "ios" ? "iOS" : "Android"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-700">
                      {num(row.count)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-700">
                      {num(row.users)}
                    </td>
                  </tr>
                ))}
                {(data?.byVersion ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-slate-400 text-sm"
                    >
                      Aucune donnée pour cette période
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
