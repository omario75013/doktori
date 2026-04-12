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
  Cell,
} from "recharts";
import { GitBranch } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = { step: string; count: number };
type FunnelData = { steps: Step[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const BAR_COLORS = ["#0891B2", "#6366F1", "#10B981", "#F59E0B"];

// ─── Conversion row ───────────────────────────────────────────────────────────

function ConversionRow({ from, to }: { from: number; to: number }) {
  const rate = from > 0 ? Math.round((to / from) * 100) : null;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>Taux de conversion →</span>
      {rate !== null ? (
        <span className="font-semibold text-slate-700">{rate}%</span>
      ) : (
        <span>—</span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FunnelPage() {
  const { data, isLoading } = useSWR<FunnelData>("/api/admin/analytics/funnel", fetcher, {
    refreshInterval: 120000,
  });

  const steps = data?.steps ?? [];

  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Funnel de réservation</h1>
          <p className="text-slate-500 mt-1">Rendez-vous des 30 derniers jours par statut</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Volume par étape</h2>
        <p className="text-xs text-slate-500 mb-5">
          Proxy : «&nbsp;Créés&nbsp;» = total rendez-vous initiés. Les étapes suivantes sont des sous-ensembles.
        </p>
        <div className="h-72">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Chargement…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={steps}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 12, fill: "#64748B" }}
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
                  formatter={(v) => [Number(v).toLocaleString("fr-FR"), "Rendez-vous"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Rendez-vous">
                  {steps.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Conversion table */}
      {!isLoading && steps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Détail & conversions</h2>
          <div className="space-y-4">
            {steps.map((step, i) => {
              const prev = steps[i - 1];
              return (
                <div key={step.step}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-slate-800">{step.step}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {step.count.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  {prev && <ConversionRow from={prev.count} to={step.count} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
