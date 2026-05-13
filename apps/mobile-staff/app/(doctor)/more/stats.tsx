import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Rect,
  Text as SvgText,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Circle,
} from "react-native-svg";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Loader, Empty } from "./_ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthlyRow = {
  month: string;
  total: number;
  completed: number;
  cancelled: number;
  no_shows: number;
};
type PeakRow = { hour: number; count: number };
type ReasonRow = { reason: string; count: number };
type StatsResponse = {
  monthlyAppointments: MonthlyRow[];
  peakHours: PeakRow[];
  topReasons: ReasonRow[];
  patientStats: { new_patients: number; returning_patients: number };
  revenueProjection: { confirmedCount: number; feeInDT: number; totalDT: number };
};

type Range = "week" | "month" | "quarter" | "year";

// ─── Palette (mirrors web) ────────────────────────────────────────────────────

const TEAL = colors.teal;
const GREEN = "#16A34A";
const ORANGE = "#EA580C";
const RED = "#DC2626";
const PURPLE = "#7C3AED";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS_FR: Record<number, string> = {
  0: "Jan", 1: "Fév", 2: "Mar", 3: "Avr",
  4: "Mai", 5: "Juin", 6: "Juil", 7: "Août",
  8: "Sep", 9: "Oct", 10: "Nov", 11: "Déc",
};
const MONTH_LABELS_AR: Record<number, string> = {
  0: "ينا", 1: "فبر", 2: "مار", 3: "أبر",
  4: "ماي", 5: "يون", 6: "يول", 7: "أغس",
  8: "سبت", 9: "أكت", 10: "نوف", 11: "ديس",
};

function formatMonth(iso: string, locale: string) {
  const d = new Date(iso);
  const map = locale === "ar" ? MONTH_LABELS_AR : MONTH_LABELS_FR;
  return `${map[d.getMonth()]} ${d.getFullYear()}`;
}

function sortMonthlyAsc(rows: MonthlyRow[]): MonthlyRow[] {
  return [...rows].sort((a, b) => +new Date(a.month) - +new Date(b.month));
}

// Pick how many trailing months to show for each range
function rangeToMonths(r: Range): number {
  switch (r) {
    case "week": return 1;
    case "month": return 1;
    case "quarter": return 3;
    case "year":
    default: return 6;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Stats() {
  const { locale } = useLocale();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [err, setErr] = useState(false);
  const [range, setRange] = useState<Range>("month");

  useEffect(() => {
    (async () => {
      try {
        const r = await api<StatsResponse>("/api/stats");
        setData(r);
      } catch {
        setErr(true);
      }
    })();
  }, []);

  if (!data && !err) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.stats.title") }} />
        <Loader />
      </>
    );
  }

  if (err || !data) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.stats.title") }} />
        <Screen>
          <Empty icon="alert-circle-outline" title={t("doctor.stats.noData")} />
        </Screen>
      </>
    );
  }

  const monthly = sortMonthlyAsc(data.monthlyAppointments);
  const monthsToShow = rangeToMonths(range);
  const visible = monthly.slice(-monthsToShow);

  const current = monthly[monthly.length - 1];
  const totalThisMonth = current?.total ?? 0;
  const completedThisMonth = current?.completed ?? 0;
  const noShowsThisMonth = current?.no_shows ?? 0;
  const completionRate =
    totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0;
  const noShowRate =
    totalThisMonth > 0 ? Math.round((noShowsThisMonth / totalThisMonth) * 100) : 0;
  const { feeInDT, confirmedCount, totalDT } = data.revenueProjection;

  // Status donut totals across all visible months
  const totals = visible.reduce(
    (acc, r) => ({
      completed: acc.completed + r.completed,
      cancelled: acc.cancelled + r.cancelled,
      no_shows: acc.no_shows + r.no_shows,
    }),
    { completed: 0, cancelled: 0, no_shows: 0 },
  );

  const exportSummary = async () => {
    const header = "month,total,completed,cancelled,no_shows";
    const rows = monthly
      .map((r) => `${r.month},${r.total},${r.completed},${r.cancelled},${r.no_shows}`)
      .join("\n");
    const csv = `${header}\n${rows}`;
    try {
      await Share.share({ message: csv, title: t("doctor.stats.exportTitle") });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.stats.title") }} />
      <Screen>
        {/* Range filter chips */}
        <RangeChips value={range} onChange={setRange} />

        {/* KPI Cards — 2x2 grid */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <KpiCard
            label={t("doctor.stats.appointmentsThisMonth")}
            value={String(totalThisMonth)}
            sub={t("doctor.stats.appointmentsThisMonthSub")}
            color={TEAL}
            icon="calendar"
          />
          <KpiCard
            label={t("doctor.stats.completionRateLabel")}
            value={`${completionRate}%`}
            sub={t("doctor.stats.completionRateSub")}
            color={GREEN}
            icon="trending-up"
          />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <KpiCard
            label={t("doctor.stats.noShowRateLabel")}
            value={`${noShowRate}%`}
            sub={t("doctor.stats.noShowRateSub")}
            color={noShowRate > 20 ? RED : ORANGE}
            icon="people"
          />
          <KpiCard
            label={t("doctor.stats.estimatedRevenueLabel")}
            value={feeInDT > 0 ? `${totalDT.toFixed(0)} DT` : "—"}
            sub={
              feeInDT > 0
                ? `${confirmedCount} ${t("doctor.stats.appointmentShort")} × ${feeInDT} DT`
                : t("doctor.stats.noFeeSet")
            }
            color={PURPLE}
            icon="cash"
          />
        </View>

        {/* Monthly stacked bars */}
        <Card title={t("doctor.stats.monthlyTitle")}>
          <Text style={styles.subtitle}>{t("doctor.stats.monthlySubtitle")}</Text>
          {visible.length === 0 ? (
            <Empty icon="bar-chart-outline" title={t("doctor.stats.noData")} />
          ) : (
            <MonthlyStackedChart data={visible} locale={locale} />
          )}
          <Legend
            items={[
              { color: GREEN, label: t("doctor.stats.completed") },
              { color: RED, label: t("doctor.stats.cancelled") },
              { color: ORANGE, label: t("doctor.stats.noShows") },
            ]}
          />
        </Card>

        {/* Status distribution donut */}
        <Card title={t("doctor.stats.statusDistributionTitle")}>
          <Text style={styles.subtitle}>{t("doctor.stats.statusDistributionSubtitle")}</Text>
          {totals.completed + totals.cancelled + totals.no_shows === 0 ? (
            <Empty icon="pie-chart-outline" title={t("doctor.stats.noData")} />
          ) : (
            <Donut
              completed={totals.completed}
              cancelled={totals.cancelled}
              noShows={totals.no_shows}
              labels={{
                completed: t("doctor.stats.completed"),
                cancelled: t("doctor.stats.cancelled"),
                noShows: t("doctor.stats.noShows"),
                total: t("doctor.stats.totalAppointments"),
              }}
            />
          )}
        </Card>

        {/* Patient types */}
        <Card title={t("doctor.stats.patientsTitle")}>
          <Text style={styles.subtitle}>{t("doctor.stats.patientsSubtitle")}</Text>
          <PatientBars
            newPatients={data.patientStats.new_patients}
            returningPatients={data.patientStats.returning_patients}
            labels={{
              newLabel: t("doctor.stats.newPatientsLabel"),
              returningLabel: t("doctor.stats.returningPatientsLabel"),
              newSuffix: t("doctor.stats.newSuffix"),
              returningSuffix: t("doctor.stats.returningSuffix"),
              empty: t("doctor.stats.noData"),
            }}
          />
        </Card>

        {/* Top 5 reasons */}
        <Card title={t("doctor.stats.topReasonsTitle")}>
          <Text style={styles.subtitle}>{t("doctor.stats.topReasonsSubtitle")}</Text>
          {data.topReasons.length === 0 ? (
            <Empty icon="list-outline" title={t("doctor.stats.noData")} />
          ) : (
            <TopReasonsBars reasons={data.topReasons} />
          )}
        </Card>

        {/* Peak hours sparkline */}
        <Card title={t("doctor.stats.peakHoursTitle")}>
          <Text style={styles.subtitle}>{t("doctor.stats.peakHoursSubtitle")}</Text>
          {data.peakHours.length === 0 ? (
            <Empty icon="time-outline" title={t("doctor.stats.noData")} />
          ) : (
            <PeakHoursArea
              peaks={data.peakHours}
              busiestLabel={t("doctor.stats.busiestSlotLabel")}
              apptShort={t("doctor.stats.appointmentShort")}
            />
          )}
        </Card>

        {/* Export button */}
        <Pressable onPress={exportSummary} style={styles.exportBtn}>
          <Ionicons name="share-outline" size={18} color={colors.teal} />
          <Text style={styles.exportBtnText}>{t("doctor.stats.exportCsv")}</Text>
        </Pressable>
      </Screen>
    </>
  );
}

// ─── Range chips ──────────────────────────────────────────────────────────────

function RangeChips({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const options: Array<{ key: Range; label: string }> = [
    { key: "week", label: t("doctor.stats.rangeWeek") },
    { key: "month", label: t("doctor.stats.rangeMonth") },
    { key: "quarter", label: t("doctor.stats.rangeQuarter") },
    { key: "year", label: t("doctor.stats.rangeYear") },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              active && { backgroundColor: colors.teal, borderColor: colors.teal },
            ]}
          >
            <Text style={[styles.chipText, active && { color: "#fff" }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kpiLabel}>{label}</Text>
          <Text style={[styles.kpiValue, { color }]}>{value}</Text>
          <Text style={styles.kpiSub}>{sub}</Text>
        </View>
        <View style={[styles.kpiIcon, { backgroundColor: `${color}1A` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      </View>
    </View>
  );
}

// ─── Monthly stacked bars ─────────────────────────────────────────────────────

function MonthlyStackedChart({
  data,
  locale,
}: {
  data: MonthlyRow[];
  locale: string;
}) {
  const width = 320;
  const height = 200;
  const padding = 28;
  const innerW = width - padding * 2;
  const innerH = height - padding - 24;
  const max = Math.max(1, ...data.map((d) => d.completed + d.cancelled + d.no_shows));
  const slotW = innerW / data.length;
  const barW = Math.min(28, slotW * 0.55);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        {/* baseline */}
        <Rect
          x={padding}
          y={height - padding}
          width={innerW}
          height={1}
          fill="#E5E7EB"
        />
        {data.map((d, i) => {
          const x = padding + slotW * i + (slotW - barW) / 2;
          const hCompleted = (innerH * d.completed) / max;
          const hCancelled = (innerH * d.cancelled) / max;
          const hNoShow = (innerH * d.no_shows) / max;
          let y = height - padding;
          const segments: Array<{ h: number; fill: string }> = [
            { h: hCompleted, fill: GREEN },
            { h: hCancelled, fill: RED },
            { h: hNoShow, fill: ORANGE },
          ];
          return (
            <G key={i}>
              {segments.map((s, k) => {
                if (s.h <= 0) return null;
                y -= s.h;
                return (
                  <Rect
                    key={k}
                    x={x}
                    y={y}
                    width={barW}
                    height={s.h}
                    fill={s.fill}
                    rx={k === segments.length - 1 ? 3 : 0}
                  />
                );
              })}
              <SvgText
                x={x + barW / 2}
                y={height - padding + 14}
                fontSize={10}
                textAnchor="middle"
                fill={colors.foregroundSecondary}
              >
                {formatMonth(d.month, locale)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────

function Donut({
  completed,
  cancelled,
  noShows,
  labels,
}: {
  completed: number;
  cancelled: number;
  noShows: number;
  labels: { completed: string; cancelled: string; noShows: string; total: string };
}) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const innerR = 38;
  const total = completed + cancelled + noShows;

  const slices = [
    { value: completed, color: GREEN, label: labels.completed },
    { value: cancelled, color: RED, label: labels.cancelled },
    { value: noShows, color: ORANGE, label: labels.noShows },
  ].filter((s) => s.value > 0);

  let angleAcc = -Math.PI / 2; // start at top

  function arcPath(start: number, end: number) {
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const xi2 = cx + innerR * Math.cos(end);
    const yi2 = cy + innerR * Math.sin(end);
    const xi1 = cx + innerR * Math.cos(start);
    const yi1 = cy + innerR * Math.sin(start);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`;
  }

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        {slices.map((s, i) => {
          const angle = (s.value / total) * Math.PI * 2;
          const start = angleAcc;
          const end = angleAcc + angle;
          angleAcc = end;
          return <Path key={i} d={arcPath(start, end)} fill={s.color} />;
        })}
        <SvgText
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={22}
          fontWeight="bold"
          fill={colors.foreground}
        >
          {total}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize={10}
          fill={colors.foregroundSecondary}
        >
          {labels.total}
        </SvgText>
      </Svg>
      <Legend items={slices.map((s) => ({ color: s.color, label: `${s.label} (${s.value})` }))} />
    </View>
  );
}

// ─── Patient type bars ────────────────────────────────────────────────────────

function PatientBars({
  newPatients,
  returningPatients,
  labels,
}: {
  newPatients: number;
  returningPatients: number;
  labels: {
    newLabel: string;
    returningLabel: string;
    newSuffix: string;
    returningSuffix: string;
    empty: string;
  };
}) {
  const total = newPatients + returningPatients;
  if (total === 0) return <Empty icon="people-outline" title={labels.empty} />;
  const newPct = Math.round((newPatients / total) * 100);
  const retPct = Math.round((returningPatients / total) * 100);
  return (
    <View style={{ gap: spacing.md }}>
      <BarLine label={labels.newLabel} count={newPatients} pct={newPct} color={colors.teal} />
      <BarLine
        label={labels.returningLabel}
        count={returningPatients}
        pct={retPct}
        color={colors.foreground}
      />
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: 4 }}>
        <LegendDot color={colors.teal} text={`${newPatients} ${labels.newSuffix}`} />
        <LegendDot color={colors.foreground} text={`${returningPatients} ${labels.returningSuffix}`} />
      </View>
    </View>
  );
}

function BarLine({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: colors.foreground }}>{label}</Text>
        <Text style={{ fontSize: 13, color: colors.foregroundSecondary }}>
          {count} <Text style={{ color: "#9CA3AF" }}>({pct}%)</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Top reasons ──────────────────────────────────────────────────────────────

function TopReasonsBars({ reasons }: { reasons: ReasonRow[] }) {
  const max = Math.max(1, ...reasons.map((r) => r.count));
  const rankColors = [TEAL, "#0E7490", "#0C6B88", "#0A5E78", "#085369"];
  return (
    <View style={{ gap: spacing.sm }}>
      {reasons.map((r, i) => {
        const pct = Math.round((r.count / max) * 100);
        const color = rankColors[i] ?? TEAL;
        return (
          <View key={i}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <View style={[styles.rank, { backgroundColor: color }]}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <Text
                style={{ flex: 1, fontSize: 13, color: colors.foreground }}
                numberOfLines={1}
              >
                {r.reason}
              </Text>
              <Text style={{ fontSize: 13, color: colors.foregroundSecondary }}>{r.count}</Text>
            </View>
            <View style={[styles.track, { marginLeft: 26 }]}>
              <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Peak hours area ──────────────────────────────────────────────────────────

function PeakHoursArea({
  peaks,
  busiestLabel,
  apptShort,
}: {
  peaks: PeakRow[];
  busiestLabel: string;
  apptShort: string;
}) {
  const width = 320;
  const height = 140;
  const padding = 20;
  const innerW = width - padding * 2;
  const innerH = height - padding - 18;

  const series = Array.from({ length: 24 }, (_, h) => {
    const f = peaks.find((p) => p.hour === h);
    return f?.count ?? 0;
  });
  const max = Math.max(1, ...series);

  const pts = series.map((v, i) => {
    const x = padding + (innerW * i) / 23;
    const y = padding + innerH - (innerH * v) / max;
    return { x, y };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    `${linePath} L ${pts[pts.length - 1].x} ${padding + innerH} L ${pts[0].x} ${padding + innerH} Z`;

  const busiest = peaks.reduce((a, b) => (a.count > b.count ? a : b), peaks[0]);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={TEAL} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#peakGrad)" />
        <Path d={linePath} stroke={TEAL} strokeWidth={2} fill="none" />
        {[0, 6, 12, 18, 23].map((h) => (
          <SvgText
            key={h}
            x={padding + (innerW * h) / 23}
            y={height - 4}
            fontSize={9}
            textAnchor="middle"
            fill={colors.foregroundSecondary}
          >
            {h}h
          </SvgText>
        ))}
        <Circle cx={pts[busiest.hour]?.x ?? 0} cy={pts[busiest.hour]?.y ?? 0} r={3} fill={TEAL} />
      </Svg>
      {busiest && (
        <Text style={{ fontSize: 12, color: colors.foregroundSecondary, marginTop: 4 }}>
          {busiestLabel}{" "}
          <Text style={{ fontWeight: "700", color: colors.foreground }}>{busiest.hour}h</Text>{" "}
          — {busiest.count} {apptShort}
        </Text>
      )}
    </View>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs }}>
      {items.map((it, i) => (
        <LegendDot key={i} color={it.color} text={it.label} />
      ))}
    </View>
  );
}

function LegendDot({ color, text }: { color: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, color: colors.foregroundSecondary }}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
  },
  kpiRow: { flexDirection: "row", alignItems: "flex-start" },
  kpiLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  kpiValue: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  kpiSub: { fontSize: 10, color: colors.foregroundSecondary, marginTop: 2 },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgSecondary,
    overflow: "hidden",
  },
  trackFill: { height: "100%", borderRadius: 4 },
  rank: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: colors.bg,
    marginTop: spacing.sm,
  },
  exportBtnText: { color: colors.teal, fontSize: 14, fontWeight: "700" },
});
