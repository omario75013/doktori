"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { date: string; bookings: number; signups: number; doctors: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatDay(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

export function TrendChart() {
  const { data, isLoading } = useSWR<{ series: Point[] }>(
    "/api/admin/trends?days=30",
    fetcher,
    { refreshInterval: 30000 }
  );

  const series = data?.series ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Tendances 30 jours
          </h2>
          <p className="text-xs text-slate-500">
            Réservations, inscriptions patients, nouveaux médecins
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <LegendDot color="#0891B2" label="RDV" />
          <LegendDot color="#6366F1" label="Patients" />
          <LegendDot color="#22C55E" label="Médecins" />
        </div>
      </div>
      <div className="h-64">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Chargement…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="date"
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
                dataKey="bookings"
                stroke="#0891B2"
                strokeWidth={2}
                dot={false}
                name="RDV"
              />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="#6366F1"
                strokeWidth={2}
                dot={false}
                name="Patients"
              />
              <Line
                type="monotone"
                dataKey="doctors"
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
                name="Médecins"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
