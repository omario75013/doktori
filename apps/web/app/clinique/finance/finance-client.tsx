"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Clock,
  Shield,
  RotateCcw,
  Download,
  Printer,
  BarChart3,
  CreditCard,
  Layers,
} from "lucide-react";
import {
  LineChart,
  Line,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Summary {
  totalRevenue: number;
  paid: number;
  pending: number;
  cnamPending: number;
  cnamApproved: number;
  refunds: number;
  walletCredits: number;
  vsPrevious: number | null;
}

interface ByDoctor {
  doctorId: string;
  doctorName: string;
  revenue: number;
  count: number;
}

interface ByMethod {
  method: string;
  total: number;
}

interface ByType {
  typeId: string;
  typeName: string;
  total: number;
  count: number;
}

interface TrendPoint {
  month: string;
  revenue: number;
}

interface ExportRow {
  date: string;
  patient: string;
  doctor: string;
  type: string;
  status: string;
  paymentStatus: string;
  method: string;
  amount: number;
}

interface FinanceData {
  summary: Summary;
  byDoctor: ByDoctor[];
  byMethod: ByMethod[];
  byType: ByType[];
  monthlyTrend: TrendPoint[];
  rows: ExportRow[];
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

type Preset = "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "custom";

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === "thisMonth") {
    return {
      from: new Date(y, m, 1).toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  if (preset === "lastMonth") {
    const firstPrev = new Date(y, m - 1, 1);
    const lastPrev = new Date(y, m, 0);
    return {
      from: firstPrev.toISOString().slice(0, 10),
      to: lastPrev.toISOString().slice(0, 10),
    };
  }
  if (preset === "thisQuarter") {
    const q = Math.floor(m / 3);
    return {
      from: new Date(y, q * 3, 1).toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  if (preset === "thisYear") {
    return {
      from: new Date(y, 0, 1).toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  // custom — caller handles
  return {
    from: new Date(y, m, 1).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Filter bar (client)
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  cash: "#10b981",
  card: "#3b82f6",
  virement: "#8b5cf6",
  cheque: "#f59e0b",
  flouci: "#06b6d4",
  online: "#6366f1",
};

function methodColor(method: string) {
  return METHOD_COLORS[method] ?? "#9ca3af";
}

const DOCTOR_COLORS = ["#0891B2", "#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899"];

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  accent,
  icon: Icon,
  iconColor,
  badge,
  index,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ElementType;
  iconColor: string;
  badge?: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.06 + index * 0.06 }}
      className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accent}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-black mt-1.5 text-foreground tabular-nums">
            {value}
          </div>
          {badge && <div className="mt-1">{badge}</div>}
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FinanceDashboard({
  doctors,
  isPrint,
}: {
  doctors: { id: string; name: string }[];
  isPrint: boolean;
}) {
  const t = useTranslations("clinique.finance");

  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [range, setRange] = useState(presetRange("thisMonth"));
  const [doctorId, setDoctorId] = useState<string>("");
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const buildUrl = useCallback(
    (extraParams?: Record<string, string>) => {
      const p = new URLSearchParams({
        from: range.from,
        to: range.to,
        ...(doctorId ? { doctorId } : {}),
        ...extraParams,
      });
      return `/api/clinique/finance?${p}`;
    },
    [range, doctorId],
  );

  useEffect(() => {
    setLoading(true);
    fetch(buildUrl())
      .then((r) => r.json())
      .then((d: FinanceData) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [buildUrl]);

  function handlePreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  }

  function handleExport(format: "csv" | "xlsx") {
    window.location.href = buildUrl({ format });
  }

  const summary = data?.summary;
  const displayRows = data?.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  const totalPages = Math.ceil((data?.rows.length ?? 0) / PAGE_SIZE);

  const PRESETS: Preset[] = ["thisMonth", "lastMonth", "thisQuarter", "thisYear", "custom"];

  return (
    <div className={`space-y-6 ${isPrint ? "print-layout" : ""}`}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
        </div>

        {!isPrint && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Printer className="h-4 w-4" />
              {t("print")}
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="h-4 w-4" />
              {t("exportCsv")}
            </button>
            <button
              onClick={() => handleExport("xlsx")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ background: "#0891B2" }}
            >
              <Download className="h-4 w-4" />
              {t("exportXlsx")}
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      {!isPrint && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-4 flex flex-wrap gap-3 items-end"
        >
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  preset === p
                    ? "text-white"
                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-gray-800",
                ].join(" ")}
                style={preset === p ? { background: "#0891B2" } : undefined}
              >
                {t(`preset${p.charAt(0).toUpperCase() + p.slice(1)}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {preset === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="px-2 py-1.5 rounded-lg border border-border text-sm bg-transparent"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="px-2 py-1.5 rounded-lg border border-border text-sm bg-transparent"
              />
            </div>
          )}

          {/* Doctor filter */}
          {doctors.length > 1 && (
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-border text-sm bg-white dark:bg-gray-900 text-foreground"
            >
              <option value="">Tous les médecins</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </motion.div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse h-28 bg-white dark:bg-gray-900 rounded-2xl border border-border"
            />
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label={t("kpiTotal")}
              value={`${summary.totalRevenue.toFixed(3)} DT`}
              accent="bg-cyan-500"
              icon={DollarSign}
              iconColor="#0891B2"
              index={0}
              badge={
                summary.vsPrevious !== null ? (
                  <span
                    className={`text-xs font-semibold flex items-center gap-0.5 ${
                      summary.vsPrevious >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {summary.vsPrevious >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {summary.vsPrevious > 0 ? "+" : ""}
                    {summary.vsPrevious}% {t("vsPrev")}
                  </span>
                ) : undefined
              }
            />
            <KpiCard
              label={t("kpiPaid")}
              value={`${summary.paid.toFixed(3)} DT`}
              accent="bg-emerald-500"
              icon={CheckCircle}
              iconColor="#10b981"
              index={1}
            />
            <KpiCard
              label={t("kpiPending")}
              value={`${summary.pending.toFixed(3)} DT`}
              accent="bg-amber-400"
              icon={Clock}
              iconColor="#f59e0b"
              index={2}
            />
            <KpiCard
              label={t("kpiCnam")}
              value={`${summary.cnamPending.toFixed(3)} DT`}
              accent="bg-blue-500"
              icon={Shield}
              iconColor="#3b82f6"
              index={3}
            />
            <KpiCard
              label={t("kpiRefunds")}
              value={`${summary.refunds.toFixed(3)} DT`}
              accent="bg-red-400"
              icon={RotateCcw}
              iconColor="#ef4444"
              index={4}
            />
          </div>
        )
      )}

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      {!loading && data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly trend line */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
            >
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: "#0891B2" }} />
                {t("monthlyTrend")}
              </h2>
              {data.monthlyTrend.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={data.monthlyTrend}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="month"
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
                      formatter={(v) => [`${Number(v).toFixed(3)} DT`, "Revenus"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0891B2"
                      strokeWidth={2.5}
                      dot={{ fill: "#0891B2", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Doctor bar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.42 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
            >
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" style={{ color: "#7c3aed" }} />
                {t("byDoctor")}
              </h2>
              {data.byDoctor.filter((d) => d.revenue > 0).length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.byDoctor.filter((d) => d.revenue > 0).map((d) => ({
                      name: d.doctorName.split(" ").pop() ?? d.doctorName,
                      revenue: d.revenue,
                    }))}
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
                      formatter={(v) => [`${Number(v).toFixed(3)} DT`, "Revenus"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {data.byDoctor
                        .filter((d) => d.revenue > 0)
                        .map((_, i) => (
                          <Cell key={i} fill={DOCTOR_COLORS[i % DOCTOR_COLORS.length]} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Payment method donut */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.49 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
            >
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4" style={{ color: "#10b981" }} />
                {t("byMethod")}
              </h2>
              {data.byMethod.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.byMethod.map((m) => ({
                        name: m.method,
                        value: m.total,
                        color: methodColor(m.method),
                      }))}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.byMethod.map((m, i) => (
                        <Cell key={i} fill={methodColor(m.method)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${Number(v).toFixed(3)} DT`]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Type mix horizontal bar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.56 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5"
            >
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4" style={{ color: "#f59e0b" }} />
                {t("byType")}
              </h2>
              {data.byType.filter((t) => t.total > 0).length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {data.byType
                    .filter((ty) => ty.total > 0)
                    .sort((a, b) => b.total - a.total)
                    .map((ty, i) => {
                      const maxTotal = Math.max(...data.byType.map((t) => t.total));
                      const pct = maxTotal > 0 ? (ty.total / maxTotal) * 100 : 0;
                      return (
                        <div key={ty.typeId}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground truncate max-w-[60%]">
                              {ty.typeName}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {ty.total.toFixed(3)} DT · {ty.count} RDV
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: DOCTOR_COLORS[i % DOCTOR_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Details table ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.63 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
              <h2 className="font-bold text-foreground">{t("details")}</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {data.rows.length} lignes
              </span>
            </div>

            {data.rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border bg-slate-50 dark:bg-gray-800/50">
                        {["Date", "Patient", "Médecin", "Type", "Statut", "Paiement", "Mode", "Montant"].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-start px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayRows.map((row, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums text-xs">
                            {row.date}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{row.patient}</td>
                          <td className="px-4 py-2.5 text-foreground">{row.doctor}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.type}</td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-2.5">
                            <PayBadge status={row.paymentStatus} />
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.method}</td>
                          <td className="px-4 py-2.5 font-black tabular-nums text-right text-foreground">
                            {row.amount.toFixed(3)} DT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Page {page + 1} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        ← Précédent
                      </button>
                      <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: "Terminé", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  confirmed: { label: "Confirmé", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  pending: { label: "En attente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  cancelled: { label: "Annulé", cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  no_show: { label: "Absent", cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
};

const PAY_MAP: Record<string, { label: string; cls: string }> = {
  paid: { label: "Payé", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pending: { label: "En attente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  unpaid: { label: "Non payé", cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  refunded: { label: "Remboursé", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

function PayBadge({ status }: { status: string }) {
  const s = PAY_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
