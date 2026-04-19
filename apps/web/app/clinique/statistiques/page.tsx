"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarCheck,
  CheckCircle,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DoctorStat {
  doctorId: string;
  name: string;
  specialty: string;
  total: number;
  completed: number;
  noShow: number;
  cancelled: number;
  completionPct: number;
  noShowPct: number;
}

interface Statistics {
  totalThisMonth: number;
  completionRate: number;
  noShowRate: number;
  activePatients: number;
  statusDistribution: { status: string; total: number }[];
  perDoctor: DoctorStat[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

const PIE_COLORS: Record<string, string> = {
  completed: "#10b981",
  confirmed: "#3b82f6",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  no_show: "#9ca3af",
};

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconColor,
  accent,
  index,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  icon: React.ElementType;
  iconColor: string;
  accent: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 + index * 0.07 }}
      className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accent}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-3xl font-black mt-1.5 text-foreground tabular-nums">
            {value}
          </div>
          <div className="text-xs text-muted-foreground/70 mt-1">{sublabel}</div>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${iconColor}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  );
}

export default function CliniqueStatistiquesPage() {
  useSession();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clinique/statistics")
      .then((r) => r.json())
      .then((data: Statistics & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: fr });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse h-28 bg-white dark:bg-gray-900 rounded-2xl border border-border"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="animate-pulse h-64 bg-white dark:bg-gray-900 rounded-2xl border border-border" />
          <div className="animate-pulse h-64 bg-white dark:bg-gray-900 rounded-2xl border border-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 text-sm">Erreur : {error}</div>
    );
  }

  if (!stats) return null;

  const barData = stats.perDoctor.map((d) => ({
    name: d.name.split(" ").slice(-1)[0], // last name only for chart
    total: d.total,
    completed: d.completed,
    noShow: d.noShow,
  }));

  const pieData = stats.statusDistribution
    .filter((s) => s.total > 0)
    .map((s) => ({
      name: STATUS_LABELS[s.status] ?? s.status,
      value: s.total,
      color: PIE_COLORS[s.status] ?? "#9ca3af",
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" style={{ color: "#0891B2" }} strokeWidth={2.5} />
          Statistiques
        </h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{monthLabel}</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="RDV ce mois"
          value={stats.totalThisMonth}
          sublabel="total toutes spécialités"
          icon={CalendarCheck}
          iconColor="#0891B2"
          accent="bg-cyan-500"
          index={0}
        />
        <KpiCard
          label="Taux de réalisation"
          value={`${stats.completionRate}%`}
          sublabel="consultations terminées"
          icon={CheckCircle}
          iconColor="#10b981"
          accent="bg-emerald-500"
          index={1}
        />
        <KpiCard
          label="Taux d'absence"
          value={`${stats.noShowRate}%`}
          sublabel="patients absents"
          icon={AlertCircle}
          iconColor="#ef4444"
          accent="bg-red-400"
          index={2}
        />
        <KpiCard
          label="Patients actifs"
          value={stats.activePatients}
          sublabel="ce mois-ci"
          icon={Users}
          iconColor="#7c3aed"
          accent="bg-purple-500"
          index={3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart — RDV per doctor */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
        >
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: "#0891B2" }} />
            RDV par médecin
          </h2>
          {barData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={barData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="total" name="Total" fill="#0891B2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Terminés" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Pie chart — status distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.37 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
        >
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Répartition des statuts
          </h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Per-doctor performance table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.44 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
          <h2 className="font-bold text-foreground">Performance par médecin</h2>
          <span className="ml-auto text-xs text-muted-foreground capitalize">
            {monthLabel}
          </span>
        </div>

        {stats.perDoctor.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun médecin associé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Médecin
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Total RDV
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Terminés
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Taux réalisation
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Absences
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.perDoctor.map((doc, i) => (
                  <motion.tr
                    key={doc.doctorId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                    className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                          style={{ background: "#0891B2" }}
                        >
                          {doc.name
                            .split(" ")
                            .slice(0, 2)
                            .map((s) => s[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {doc.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {doc.specialty}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black tabular-nums text-foreground">
                      {doc.total}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">
                      {doc.completed}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${doc.completionPct}%`,
                              background: "#10b981",
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground tabular-nums w-8 text-right">
                          {doc.completionPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          doc.noShow > 0 ? "text-red-500" : "text-muted-foreground"
                        }`}
                      >
                        {doc.noShow}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
