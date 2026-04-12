"use client";

import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Map } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CityRow = { city: string; count: number };
type SpecialtyRow = { specialty: string; count: number };
type RegionsData = { byCity: CityRow[]; bySpecialty: SpecialtyRow[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const AXIS_STYLE = { fontSize: 11, fill: "#64748B" };
const TOOLTIP_STYLE = { borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 };

// ─── Chart card ───────────────────────────────────────────────────────────────

function BarCard({
  title,
  subtitle,
  data,
  dataKey,
  nameKey,
  color,
  isLoading,
}: {
  title: string;
  subtitle: string;
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  color: string;
  isLoading: boolean;
}) {
  // For long labels on horizontal bar we flip to vertical layout when many entries
  const layout = data.length > 8 ? "vertical" : "horizontal";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-900 mb-1">{title}</h2>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      <div className="h-72">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Chargement…
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Aucune donnée
          </div>
        ) : layout === "vertical" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis
                type="number"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey={nameKey}
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                width={75}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [Number(v).toLocaleString("fr-FR"), "Rendez-vous"]}
              />
              <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} name="Rendez-vous" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, left: -10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey={nameKey}
                tick={{ ...AXIS_STYLE, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [Number(v).toLocaleString("fr-FR"), "Rendez-vous"]}
              />
              <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} name="Rendez-vous" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegionsPage() {
  const { data, isLoading } = useSWR<RegionsData>("/api/admin/analytics/regions", fetcher, {
    refreshInterval: 120000,
  });

  const byCity = (data?.byCity ?? []).map((r) => ({ city: r.city, count: Number(r.count) }));
  const bySpecialty = (data?.bySpecialty ?? []).map((r) => ({
    specialty: r.specialty,
    count: Number(r.count),
  }));

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Map className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Répartition régionale</h1>
          <p className="text-slate-500 mt-1">Rendez-vous par ville et spécialité — 30 derniers jours</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarCard
          title="Par ville"
          subtitle="Nombre de rendez-vous créés dans les 30 derniers jours"
          data={byCity}
          dataKey="count"
          nameKey="city"
          color="#0891B2"
          isLoading={isLoading}
        />
        <BarCard
          title="Par spécialité"
          subtitle="Nombre de rendez-vous créés dans les 30 derniers jours"
          data={bySpecialty}
          dataKey="count"
          nameKey="specialty"
          color="#6366F1"
          isLoading={isLoading}
        />
      </div>

      {/* Raw data tables */}
      {!isLoading && (byCity.length > 0 || bySpecialty.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cities table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Top villes</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 text-left font-medium">Ville</th>
                  <th className="pb-2 text-right font-medium">RDV</th>
                  <th className="pb-2 text-right font-medium">Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byCity.map((row) => {
                  const total = byCity.reduce((s, r) => s + r.count, 0);
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <tr key={row.city} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 text-slate-700 capitalize">{row.city}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-slate-900">
                        {row.count.toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2.5 text-right text-xs text-slate-500">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Specialties table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Top spécialités</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 text-left font-medium">Spécialité</th>
                  <th className="pb-2 text-right font-medium">RDV</th>
                  <th className="pb-2 text-right font-medium">Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bySpecialty.map((row) => {
                  const total = bySpecialty.reduce((s, r) => s + r.count, 0);
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <tr key={row.specialty} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 text-slate-700 capitalize">{row.specialty}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-slate-900">
                        {row.count.toLocaleString("fr-FR")}
                      </td>
                      <td className="py-2.5 text-right text-xs text-slate-500">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
