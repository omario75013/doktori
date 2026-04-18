"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, Users, Award } from "lucide-react";

interface RevenueData {
  total_this_month: number;
  by_source: Array<{ source: string; total: number }>;
  monthly_trend: Array<{ month: string; total: number }>;
  subscriptions_by_plan: Array<{ plan: string; count: number }>;
  top_doctors: Array<{
    id: string;
    name: string;
    email: string;
    total_consultations: number;
    total_revenue: number;
    total_commission: number;
  }>;
  trial_conversions: number;
}

const PIE_COLORS = ["#0891B2", "#10B981", "#F59E0B", "#EF4444"];
const PLAN_COLORS: Record<string, string> = {
  free: "#94A3B8",
  essentiel: "#0891B2",
  pro: "#10B981",
  clinique: "#7C3AED",
};

function formatDT(millimes: number): string {
  return (millimes / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " DT";
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function RevenueOverviewPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/finance/revenue")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: RevenueData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
        setLoading(false);
      });
  }, []);

  const totalRevenue = data?.top_doctors.reduce((acc, d) => acc + Number(d.total_revenue), 0) ?? 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Revenus</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble des commissions et revenus</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 h-28 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-8 text-sm">
          Erreur de chargement : {error}
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Commissions ce mois"
              value={formatDT(data.total_this_month)}
              icon={DollarSign}
              color="bg-teal-50 text-teal-600"
              sub="SOS + Téléconsultation"
            />
            <StatCard
              title="Revenus total médecins"
              value={formatDT(totalRevenue)}
              icon={TrendingUp}
              color="bg-emerald-50 text-emerald-600"
              sub="Tous temps confondus"
            />
            <StatCard
              title="Médecins top 10"
              value={String(data.top_doctors.length)}
              icon={Award}
              color="bg-violet-50 text-violet-600"
              sub="Par commission générée"
            />
            <StatCard
              title="Conversions d'essai"
              value={String(data.trial_conversions)}
              icon={Users}
              color="bg-blue-50 text-blue-600"
              sub="Ce mois-ci"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue by source - Pie chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenus par source</h2>
              {data.by_source.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Aucune donnée ce mois</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.by_source.map((d) => ({ ...d, total: Number(d.total) }))}
                      dataKey="total"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} (${(((percent ?? 0)) * 100).toFixed(0)}%)`
                      }
                    >
                      {data.by_source.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatDT(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Active subscriptions by plan - Bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Abonnements actifs par plan</h2>
              {data.subscriptions_by_plan.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Aucun abonnement actif</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.subscriptions_by_plan} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="plan" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Médecins" radius={[4, 4, 0, 0]}>
                      {data.subscriptions_by_plan.map((d, i) => (
                        <Cell key={i} fill={PLAN_COLORS[d.plan] ?? "#0891B2"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Monthly trend - Line chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Tendance mensuelle des commissions (12 derniers mois)</h2>
            {data.monthly_trend.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Aucune donnée disponible</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={data.monthly_trend.map((d) => ({ ...d, total: Number(d.total) / 1000 }))}
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" DT" />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(3)} DT`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Commissions (DT)"
                    stroke="#0891B2"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top doctors table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Top 10 médecins par commission</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Médecin</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Consultations</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Revenus générés</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.top_doctors.map((doc, i) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{doc.name}</td>
                      <td className="px-4 py-3 text-slate-500">{doc.email}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{doc.total_consultations}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatDT(Number(doc.total_revenue))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-teal-700">
                        {formatDT(Number(doc.total_commission))}
                      </td>
                    </tr>
                  ))}
                  {data.top_doctors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Aucune donnée disponible
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
