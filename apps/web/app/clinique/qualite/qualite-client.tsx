"use client";

import { useState, Fragment } from "react";
import { useTranslations } from "next-intl";
import {
  Award,
  Star,
  CalendarCheck,
  TrendingDown,
  BarChart3,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DoctorQuality = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  avgRating: number | null;
  ratingCount: number;
  noShowRate: number;
  completionRate: number;
  cancelRate: number;
  totalRdv: number;
  satisfactionScore: null;
};

export type MonthlyTrend = {
  month: string;
  avgRating: number | null;
  noShowRate: number;
  totalRdv: number;
};

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  iconColor,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  accent: string;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-border shadow-sm overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accent}`} />
      <div className="flex items-start justify-between gap-3 pl-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-3xl font-black mt-1.5 text-foreground tabular-nums">
            {value}
          </div>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${iconColor}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend chart (loaded on row expand)
// ---------------------------------------------------------------------------

function TrendChart({
  doctorId,
  t,
}: {
  doctorId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [data, setData] = useState<MonthlyTrend[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  if (!fetched && !loading) {
    setLoading(true);
    fetch(`/api/clinique/qualite?doctorId=${doctorId}`)
      .then((r) => r.json())
      .then((json: { monthlyTrend?: MonthlyTrend[] }) => {
        setData(json.monthlyTrend ?? []);
        setFetched(true);
        setLoading(false);
      })
      .catch(() => {
        setFetched(true);
        setLoading(false);
      });
  }

  if (loading || !fetched) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        Chargement…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        Pas de données
      </div>
    );
  }

  return (
    <div className="pt-2 pb-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t("monthlyTrend")}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              fontSize: "11px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={8} />
          <Line
            type="monotone"
            dataKey="avgRating"
            name="Note /5"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="noShowRate"
            name="Absents %"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="totalRdv"
            name="RDV"
            stroke="#0891B2"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function QualiteClient({
  doctors,
  avgRating,
  noShowRate,
  totalRdv,
  totalReviews,
}: {
  doctors: DoctorQuality[];
  avgRating: number | null;
  noShowRate: number;
  totalRdv: number;
  totalReviews: number;
}) {
  const t = useTranslations("clinique.qualite");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof DoctorQuality>("avgRating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: keyof DoctorQuality) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...doctors].sort((a, b) => {
    const av = a[sortKey] as number | null;
    const bv = b[sortKey] as number | null;
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  function SortIcon({ col }: { col: keyof DoctorQuality }) {
    if (col !== sortKey) return null;
    return sortDir === "desc" ? (
      <ChevronDown className="inline h-3 w-3 ms-0.5" />
    ) : (
      <ChevronUp className="inline h-3 w-3 ms-0.5" />
    );
  }

  function ThBtn({
    col,
    label,
    className,
  }: {
    col: keyof DoctorQuality;
    label: string;
    className?: string;
  }) {
    return (
      <th
        className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ""}`}
        onClick={() => toggleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </th>
    );
  }

  function pct(n: number) {
    return `${n}%`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Award className="h-6 w-6" style={{ color: "#0891B2" }} strokeWidth={2.5} />
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-gray-900 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            {t("print")}
          </button>
          <a
            href="/api/clinique/qualite?format=csv"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-gray-900 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t("exportCsv")}
          </a>
          <a
            href="/api/clinique/qualite?format=xlsx"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t("exportXlsx")}
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label={t("kpiAvgRating")}
          value={avgRating !== null ? `${avgRating}/5` : "—"}
          icon={Star}
          iconColor="#f59e0b"
          accent="bg-amber-400"
        />
        <KpiCard
          label={t("kpiNoShow")}
          value={pct(noShowRate)}
          icon={TrendingDown}
          iconColor="#ef4444"
          accent="bg-red-400"
        />
        <KpiCard
          label={t("kpiTotalRdv")}
          value={totalRdv}
          icon={CalendarCheck}
          iconColor="#0891B2"
          accent="bg-cyan-500"
        />
        <KpiCard
          label={t("kpiReviews")}
          value={totalReviews}
          icon={BarChart3}
          iconColor="#7c3aed"
          accent="bg-purple-500"
        />
      </div>

      {/* Doctor table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Award className="h-4 w-4" style={{ color: "#0891B2" }} strokeWidth={2.5} />
          <h2 className="font-bold text-foreground">{t("title")}</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {doctors.length} médecins
          </span>
        </div>

        {doctors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Aucun médecin associé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-gray-800/50">
                  <ThBtn col="doctorName" label={t("colDoctor")} className="text-start" />
                  <ThBtn col="specialty" label={t("colSpecialty")} className="text-start" />
                  <ThBtn col="avgRating" label={t("colRating")} className="text-end" />
                  <ThBtn col="noShowRate" label={t("colNoShow")} className="text-end" />
                  <ThBtn col="completionRate" label={t("colCompletion")} className="text-end" />
                  <ThBtn col="cancelRate" label={t("colCancel")} className="text-end" />
                  <ThBtn col="totalRdv" label={t("colTotal")} className="text-end" />
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-end">
                    {t("colSatisfaction")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((doc, i) => {
                  const isTop3 = i < 3 && doc.avgRating !== null;
                  const isExpanded = expandedId === doc.doctorId;

                  return (
                    <Fragment key={doc.doctorId}>
                      <tr
                        className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : doc.doctorId)
                        }
                      >
                        {/* Doctor name + badge */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                              style={{ background: "#0891B2" }}
                            >
                              {doc.doctorName
                                .split(" ")
                                .slice(0, 2)
                                .map((s) => s[0])
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                {doc.doctorName}
                                {isTop3 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    <Award className="h-2.5 w-2.5" />
                                    {t("topBadge")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Specialty */}
                        <td className="px-4 py-3 text-muted-foreground">
                          {doc.specialty}
                        </td>

                        {/* Avg rating */}
                        <td className="px-4 py-3 text-end">
                          {doc.avgRating !== null ? (
                            <span className="font-black tabular-nums text-amber-500">
                              ★ {doc.avgRating}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {doc.ratingCount > 0 && (
                            <span className="block text-[10px] text-muted-foreground">
                              {doc.ratingCount} avis
                            </span>
                          )}
                        </td>

                        {/* No-show rate */}
                        <td className="px-4 py-3 text-end">
                          <span
                            className={`font-semibold tabular-nums text-xs ${
                              doc.noShowRate > 15
                                ? "text-red-500"
                                : doc.noShowRate > 5
                                ? "text-amber-500"
                                : "text-emerald-600"
                            }`}
                          >
                            {pct(doc.noShowRate)}
                          </span>
                        </td>

                        {/* Completion rate */}
                        <td className="px-4 py-3 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${doc.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums w-8 text-end">
                              {pct(doc.completionRate)}
                            </span>
                          </div>
                        </td>

                        {/* Cancel rate */}
                        <td className="px-4 py-3 text-end">
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                            {pct(doc.cancelRate)}
                          </span>
                        </td>

                        {/* Total RDV */}
                        <td className="px-4 py-3 text-end font-black tabular-nums text-foreground">
                          {doc.totalRdv}
                        </td>

                        {/* Satisfaction */}
                        <td className="px-4 py-3 text-end text-muted-foreground text-xs">—</td>
                      </tr>

                      {/* Expanded trend row */}
                      {isExpanded && (
                        <tr key={`${doc.doctorId}-trend`} className="bg-slate-50/60 dark:bg-gray-800/30">
                          <td colSpan={8} className="px-6 py-4">
                            <TrendChart doctorId={doc.doctorId} t={t} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
