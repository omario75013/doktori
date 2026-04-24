import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect, Circle, Path, Text as SvgText } from "react-native-svg";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  practiceId: string | null;
  patientName: string;
  patientPhone: string;
  patientNoShowCount: number;
};

type DoctorMe = { id: string; name: string; email: string };
type Secretary = { id: string; name: string; photoUrl: string | null; isActive: boolean };
type BillingInfo = { plan: string; smsUsed: number; smsLimit: number; renewsAt: string | null };

const STATUS_LABELS: Record<string, string> = {
  pending: "À confirmer",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FED7AA", fg: "#9A3412" },
  confirmed: { bg: "#E0F2FE", fg: "#075985" },
  completed: { bg: "#DBEAFE", fg: "#1E40AF" },
  cancelled: { bg: "#E5E7EB", fg: "#4B5563" },
  no_show: { bg: "#FECACA", fg: "#991B1B" },
};

export default function Home() {
  const [me, setMe] = useState<DoctorMe | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profile, list, secs, bill] = await Promise.all([
        api<DoctorMe>("/api/doctor/me"),
        api<Appointment[]>("/api/appointments/doctor"),
        api<Secretary[]>("/api/secretaries").catch(() => []),
        api<BillingInfo>("/api/billing/current").catch(() => null),
      ]);
      setMe(profile);
      setAppointments(list);
      setSecretaries(Array.isArray(secs) ? secs : []);
      setBilling(bill);
    } catch (e) {
      console.warn("home load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const todayAppts = useMemo(
    () =>
      appointments
        .filter((a) => {
          const d = new Date(a.startsAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === startOfToday.getTime();
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments, startOfToday]
  );

  const upcomingCount = appointments.filter((a) => {
    const d = new Date(a.startsAt);
    return d > today && a.status !== "cancelled";
  }).length;

  const completedTodayCount = todayAppts.filter((a) => a.status === "completed").length;
  const pendingTodayCount = todayAppts.filter(
    (a) => a.status === "confirmed" || a.status === "pending"
  ).length;

  const nextAppt = todayAppts.find(
    (a) =>
      new Date(a.startsAt) >= today &&
      (a.status === "confirmed" || a.status === "pending")
  );

  const weeklyCounts = useMemo(() => {
    const base = new Date(today);
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i));
      const count = appointments.filter(
        (a) => new Date(a.startsAt).toDateString() === d.toDateString()
      ).length;
      return { date: d, count };
    });
  }, [appointments, today]);

  const statusDistribution = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const dist: Record<string, number> = {};
    for (const a of appointments) {
      if (new Date(a.startsAt) >= since) {
        dist[a.status] = (dist[a.status] ?? 0) + 1;
      }
    }
    return dist;
  }, [appointments]);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  const lastName = me?.name?.split(" ").slice(-1)[0] ?? "";

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.teal}
          />
        }
      >
        <View>
          <Text style={styles.greeting}>Bonjour, Dr. {lastName}</Text>
          <Text style={styles.sub}>
            {today.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        <View style={styles.kpis}>
          <Kpi label="Aujourd'hui" value={String(todayAppts.length)} />
          <Kpi label="Terminés" value={String(completedTodayCount)} />
          <Kpi label="À venir" value={String(pendingTodayCount)} />
          <Kpi label="Semaine" value={String(upcomingCount)} />
        </View>

        {nextAppt ? (
          <Pressable
            style={styles.nextCard}
            onPress={() => router.push("/(doctor)/calendrier")}
          >
            <Text style={styles.nextLabel}>Prochain rendez-vous</Text>
            <View style={styles.nextBody}>
              <View style={styles.nextTime}>
                <Text style={styles.nextTimeText}>
                  {new Date(nextAppt.startsAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextPatient}>{nextAppt.patientName}</Text>
                {nextAppt.reason && (
                  <Text style={styles.nextReason}>{nextAppt.reason}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : todayAppts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sunny-outline" size={28} color={colors.teal} />
            <Text style={styles.emptyTitle}>Journée libre</Text>
            <Text style={styles.emptySub}>
              Aucun rendez-vous prévu aujourd&apos;hui.
            </Text>
          </View>
        ) : null}

        <QuickAccess />

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>Rendez-vous — 7 derniers jours</Text>
            <Text style={styles.chartTotal}>
              {weeklyCounts.reduce((s, c) => s + c.count, 0)} total
            </Text>
          </View>
          <BarChart data={weeklyCounts} />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>Statut — 30 derniers jours</Text>
          </View>
          <StatusDonut distribution={statusDistribution} />
        </View>

        {/* Mon équipe */}
        {secretaries.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Mon équipe</Text>
              <Pressable onPress={() => router.push("/(doctor)/more/secretaires" as never)}>
                <Text style={styles.seeAll}>Gérer</Text>
              </Pressable>
            </View>
            <View style={styles.teamRow}>
              {secretaries.slice(0, 4).map((s) => {
                const initials = s.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
                return (
                  <View key={s.id} style={styles.teamMember}>
                    <View style={[styles.teamAvatar, !s.isActive && { opacity: 0.4 }]}>
                      <Text style={styles.teamInitials}>{initials}</Text>
                    </View>
                    {s.isActive && <View style={styles.activeDot} />}
                    <Text style={styles.teamName} numberOfLines={1}>{s.name.split(" ")[0]}</Text>
                  </View>
                );
              })}
              {secretaries.length > 4 && (
                <View style={styles.teamMember}>
                  <View style={[styles.teamAvatar, { backgroundColor: colors.bgSecondary }]}>
                    <Text style={[styles.teamInitials, { color: colors.foregroundSecondary }]}>+{secretaries.length - 4}</Text>
                  </View>
                  <Text style={styles.teamName}>autres</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Plan actuel */}
        {billing && (
          <Pressable
            style={styles.planCard}
            onPress={() => router.push("/(doctor)/more/abonnement" as never)}
          >
            <View style={styles.planLeft}>
              <Text style={styles.planLabel}>Plan actuel</Text>
              <Text style={styles.planName}>{billing.plan}</Text>
              {billing.renewsAt && (
                <Text style={styles.planRenew}>
                  Renouvellement :{" "}
                  {new Date(billing.renewsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </Text>
              )}
            </View>
            <View style={styles.planSms}>
              <Text style={styles.planSmsValue}>
                {billing.smsLimit >= 999999 ? "∞" : `${billing.smsUsed}/${billing.smsLimit}`}
              </Text>
              <Text style={styles.planSmsLabel}>SMS</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.foregroundSecondary} />
          </Pressable>
        )}

        {todayAppts.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.sectionTitle}>Agenda du jour</Text>
            {todayAppts.slice(0, 5).map((a) => (
              <ApptRow key={a.id} appt={a} />
            ))}
            {todayAppts.length > 5 && (
              <Pressable
                onPress={() => router.push("/(doctor)/calendrier")}
                style={styles.moreBtn}
              >
                <Text style={styles.moreBtnText}>
                  Voir les {todayAppts.length - 5} autres
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.teal} />
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function QuickAccess() {
  const items: Array<{ icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; path: string }> = [
    { icon: "calendar-number", label: "Rendez-vous", path: "/(doctor)/more/rendez-vous" },
    { icon: "stats-chart", label: "Statistiques", path: "/(doctor)/more/stats" },
    { icon: "wallet", label: "Wallet", path: "/(doctor)/more/wallet" },
    { icon: "person", label: "Mon profil", path: "/(doctor)/more/profil" },
  ];
  return (
    <View style={styles.shortcuts}>
      {items.map((it) => (
        <Pressable key={it.path} style={styles.shortcut} onPress={() => router.push(it.path as never)}>
          <View style={styles.shortcutIcon}>
            <Ionicons name={it.icon} size={20} color={colors.teal} />
          </View>
          <Text style={styles.shortcutLabel}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function BarChart({ data }: { data: Array<{ date: Date; count: number }> }) {
  const width = 300;
  const height = 120;
  const padding = 20;
  const barW = (width - padding * 2) / data.length - 6;
  const max = Math.max(1, ...data.map((d) => d.count));
  const DOW = ["D", "L", "M", "M", "J", "V", "S"];
  const today = new Date().toDateString();

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = ((height - padding - 20) * d.count) / max;
          const x = padding + i * (barW + 6);
          const y = height - padding - h;
          const isToday = d.date.toDateString() === today;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={4}
              fill={isToday ? colors.teal : colors.tealLight}
            />
          );
        })}
        {data.map((d, i) => {
          const x = padding + i * (barW + 6) + barW / 2;
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={height - 6}
              fontSize={10}
              textAnchor="middle"
              fill={colors.foregroundSecondary}
            >
              {DOW[d.date.getDay()]}
            </SvgText>
          );
        })}
        {data.map((d, i) => {
          if (d.count === 0) return null;
          const h = ((height - padding - 20) * d.count) / max;
          const x = padding + i * (barW + 6) + barW / 2;
          const y = height - padding - h - 4;
          return (
            <SvgText
              key={`val-${i}`}
              x={x}
              y={y}
              fontSize={9}
              textAnchor="middle"
              fill={colors.foreground}
              fontWeight="700"
            >
              {d.count}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function StatusDonut({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  const entries = Object.entries(distribution).sort(([, a], [, b]) => b - a);
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 55;
  const stroke = 18;

  let start = -Math.PI / 2;
  const segments = entries.map(([status, count]) => {
    const frac = count / (total || 1);
    const end = start + frac * Math.PI * 2;
    const x1 = cx + Math.cos(start) * r;
    const y1 = cy + Math.sin(start) * r;
    const x2 = cx + Math.cos(end) * r;
    const y2 = cy + Math.sin(end) * r;
    const large = frac > 0.5 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    start = end;
    return { status, count, path, color: STATUS_TONES[status]?.fg ?? colors.teal };
  });

  return (
    <View style={styles.donutRow}>
      {total === 0 ? (
        <Text style={styles.emptyText}>Pas encore de données.</Text>
      ) : (
        <>
          <Svg width={size} height={size}>
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={colors.border}
              strokeWidth={stroke}
              fill="none"
            />
            {segments.map((s, i) => (
              <Path
                key={i}
                d={s.path}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
              />
            ))}
            <SvgText
              x={cx}
              y={cy - 2}
              fontSize={22}
              textAnchor="middle"
              fill={colors.foreground}
              fontWeight="800"
            >
              {total}
            </SvgText>
            <SvgText
              x={cx}
              y={cy + 14}
              fontSize={10}
              textAnchor="middle"
              fill={colors.foregroundSecondary}
            >
              RDV
            </SvgText>
          </Svg>
          <View style={{ flex: 1, gap: 4 }}>
            {segments.map((s) => (
              <View key={s.status} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.legendLabel}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </Text>
                <Text style={styles.legendValue}>{s.count}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function ApptRow({ appt }: { appt: Appointment }) {
  const start = new Date(appt.startsAt);
  const hhmm = start.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const tone = STATUS_TONES[appt.status] ?? { bg: colors.bgSecondary, fg: colors.teal };
  return (
    <Pressable style={styles.row}>
      <View style={styles.time}>
        <Text style={styles.timeText}>{hhmm}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.patient}>{appt.patientName}</Text>
        {appt.reason && <Text style={styles.reason}>{appt.reason}</Text>}
      </View>
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <Text style={[styles.badgeText, { color: tone.fg }]}>
          {STATUS_LABELS[appt.status] ?? appt.status}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] },
  greeting: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  sub: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  kpis: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  kpi: {
    flex: 1,
    minWidth: "22%",
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: colors.teal },
  kpiLabel: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: "center",
  },
  nextCard: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  nextLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  nextBody: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  nextTime: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  nextTimeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontFamily: "monospace",
    fontSize: 18,
  },
  nextPatient: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  nextReason: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  emptyCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  emptySub: { fontSize: 12, color: colors.foregroundSecondary },
  shortcuts: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  shortcut: {
    flex: 1,
    minWidth: "22%",
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutIcon: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutLabel: { fontSize: 11, color: colors.foreground, fontWeight: "600" },
  chartCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  chartHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  chartTotal: { fontSize: 11, color: colors.foregroundSecondary },
  donutRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 12, color: colors.foreground },
  legendValue: { fontSize: 12, color: colors.foregroundSecondary, fontWeight: "700" },
  emptyText: { color: colors.foregroundSecondary, fontSize: 12 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  time: {
    width: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  timeText: { color: colors.teal, fontWeight: "700", fontFamily: "monospace" },
  patient: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  reason: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  moreBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  moreBtnText: { color: colors.teal, fontSize: 13, fontWeight: "600" },

  sectionBlock: { gap: spacing.sm },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { fontSize: 12, fontWeight: "700", color: colors.teal },
  teamRow: { flexDirection: "row", gap: spacing.md },
  teamMember: { alignItems: "center", gap: 4, position: "relative" },
  teamAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.teal}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInitials: { fontSize: 16, fontWeight: "800", color: colors.teal },
  activeDot: {
    position: "absolute",
    bottom: 22,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  teamName: { fontSize: 11, color: colors.foreground, fontWeight: "600" },

  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: `${colors.teal}10`,
  },
  planLeft: { flex: 1 },
  planLabel: { fontSize: 10, fontWeight: "700", color: colors.teal, textTransform: "uppercase", letterSpacing: 0.5 },
  planName: { fontSize: 16, fontWeight: "800", color: colors.foreground, marginTop: 2 },
  planRenew: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  planSms: { alignItems: "center" },
  planSmsValue: { fontSize: 18, fontWeight: "800", color: colors.teal },
  planSmsLabel: { fontSize: 10, color: colors.foregroundSecondary, fontWeight: "700", textTransform: "uppercase" },
});
