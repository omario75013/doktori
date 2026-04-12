"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, Clock, MapPin, CheckCircle } from "lucide-react";

interface KpiData {
  acceptanceRate: number;
  medianResponseTimeMs: number | null;
  medianDistanceM: number | null;
  completionRate: number;
  declineReasons: { reason: string; count: number }[];
  bySymptom: { category: string; count: number; acceptedCount: number }[];
  byHour: { hour: number; count: number }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function KpiCard({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
      <p className="text-3xl font-bold text-slate-900">
        {value}
        {unit && <span className="text-lg font-normal text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function formatMs(ms: number | null): string {
  if (!ms) return "—";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins} min`;
}

function formatKm(m: number | null): string {
  if (!m) return "—";
  return `${(m / 1000).toFixed(1)} km`;
}

export default function SosKpisPage() {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const queryStr = `from=${fromDate}&to=${toDate}`;
  const { data, isLoading } = useSWR<KpiData>(
    `/api/admin/sos/kpis?${queryStr}`,
    fetcher
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">KPIs SOS</h1>
          <p className="text-slate-500 mt-1">Indicateurs de performance des sessions SOS</p>
        </div>

        {/* Date range */}
        <div className="flex items-end gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Du</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Au</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-20 text-slate-500">Chargement…</div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Taux d'acceptation"
              value={`${Math.round((data.acceptanceRate ?? 0) * 100)}`}
              unit="%"
              icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
              color="bg-teal-50"
            />
            <KpiCard
              label="Temps de réponse médian"
              value={formatMs(data.medianResponseTimeMs)}
              icon={<Clock className="w-5 h-5 text-blue-600" />}
              color="bg-blue-50"
            />
            <KpiCard
              label="Distance médiane"
              value={formatKm(data.medianDistanceM)}
              icon={<MapPin className="w-5 h-5 text-amber-600" />}
              color="bg-amber-50"
            />
            <KpiCard
              label="Taux de complétion"
              value={`${Math.round((data.completionRate ?? 0) * 100)}`}
              unit="%"
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              color="bg-green-50"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* By symptom */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
                Demandes par symptôme
              </h2>
              {data.bySymptom.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.bySymptom} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Total" fill="#0d9488" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="acceptedCount" name="Acceptées" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                  Aucune donnée
                </div>
              )}
            </div>

            {/* By hour */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
                Demandes par heure
              </h2>
              {data.byHour.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.byHour} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h) => `${h}h`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [v, "Demandes"]} labelFormatter={(h) => `${h}h00`} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Demandes"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>

          {/* Decline reasons table */}
          {data.declineReasons.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Raisons de refus
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-semibold">Raison</th>
                    <th className="px-5 py-3 font-semibold text-right">Occurrences</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.declineReasons.map((r) => (
                    <tr key={r.reason} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-800">{r.reason || "Non précisé"}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-700 tabular-nums">
                        {r.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
