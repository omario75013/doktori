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
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

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

type ActivityItem = {
  id: string;
  status: string;
  startsAt: string;
  updatedAt: string;
  patientName: string;
};

type MobileDashboard = {
  todayCount: number;
  waitingRoomCount: number;
  teleconsultCount: number;
  walletBalance: number;
  sms: { used: number; limit: number; plan: string };
  monthTotal: number;
  monthCompleted: number;
  monthNoShows: number;
  monthNoShowsRolling: number;
  completionRate: number | null;
  totalPatients: number;
  recentActivity: ActivityItem[];
};

function getStatusLabels(): Record<string, string> {
  return {
    pending: t("doctor.home.toConfirm"),
    confirmed: t("doctor.home.confirmed"),
    completed: t("doctor.home.done"),
    cancelled: t("doctor.home.cancelled"),
    no_show: t("doctor.home.absent"),
  };
}

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FED7AA", fg: "#9A3412" },
  confirmed: { bg: "#E0F2FE", fg: "#075985" },
  completed: { bg: "#DBEAFE", fg: "#1E40AF" },
  cancelled: { bg: "#E5E7EB", fg: "#4B5563" },
  no_show: { bg: "#FECACA", fg: "#991B1B" },
};

export default function Home() {
  const { locale } = useLocale();
  const STATUS_LABELS = getStatusLabels();
  const [me, setMe] = useState<DoctorMe | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [dashboard, setDashboard] = useState<MobileDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profile, list, secs, bill, dash] = await Promise.all([
        api<DoctorMe>("/api/doctor/me"),
        api<Appointment[]>("/api/appointments/doctor"),
        api<Secretary[]>("/api/secretaries").catch(() => []),
        api<BillingInfo>("/api/billing/current").catch(() => null),
        api<MobileDashboard>("/api/doctor/mobile-dashboard").catch(() => null),
      ]);
      setMe(profile);
      setAppointments(list);
      setSecretaries(Array.isArray(secs) ? secs : []);
      setBilling(bill);
      setDashboard(dash);
    } catch (e) {
      console.warn("home load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Poll dashboard every 30s for live waiting-room count (replaces WebSocket).
  const pollDashboard = useCallback(async () => {
    try {
      const dash = await api<MobileDashboard>("/api/doctor/mobile-dashboard");
      setDashboard(dash);
    } catch {
      /* swallow — next tick may succeed */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      void pollDashboard();
    }, 30_000);
    return () => clearInterval(id);
  }, [pollDashboard]);

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
          <Text style={styles.greeting}>{t("doctor.home.greeting")}{lastName}</Text>
          <Text style={styles.sub}>
            {today.toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        <View style={styles.kpis}>
          <Kpi label={t("doctor.home.today")} value={String(todayAppts.length)} />
          <Kpi label={t("doctor.home.completed")} value={String(completedTodayCount)} />
          <Kpi label={t("doctor.home.upcoming")} value={String(pendingTodayCount)} />
          <Kpi label={t("doctor.home.week")} value={String(upcomingCount)} />
        </View>

        {/* Web-parity KPI row: waiting room, teleconsult, revenue, patients */}
        {dashboard && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kpiScrollRow}
          >
            <BigKpi
              icon="people"
              label={t("doctor.home.kpiWaitingRoom")}
              value={String(dashboard.waitingRoomCount)}
              tone={dashboard.waitingRoomCount > 0 ? "live" : "neutral"}
              sub={
                dashboard.waitingRoomCount > 0
                  ? t("doctor.home.waitingRoomLive")
                  : t("doctor.home.waitingNone")
              }
              onPress={() => router.push("/(doctor)/calendrier")}
            />
            <BigKpi
              icon="videocam"
              label={t("doctor.home.kpiTeleconsult")}
              value={String(dashboard.teleconsultCount)}
              tone="teal"
            />
            <BigKpi
              icon="wallet"
              label={t("doctor.home.kpiRevenue")}
              value={`${(dashboard.walletBalance / 1000).toFixed(1)}`}
              sub={t("doctor.home.tnd")}
              tone="green"
              onPress={() => router.push("/(doctor)/more/wallet" as never)}
            />
            <BigKpi
              icon="medkit"
              label={t("doctor.home.kpiPatients")}
              value={String(dashboard.totalPatients)}
              tone="neutral"
            />
          </ScrollView>
        )}

        {/* SMS counter card */}
        {dashboard && dashboard.sms.limit > 0 && (
          <SmsCard sms={dashboard.sms} />
        )}

        {/* Completion rate card */}
        {dashboard && (
          <CompletionRateCard
            rate={dashboard.completionRate}
            completed={dashboard.monthCompleted}
            noShows={dashboard.monthNoShows}
          />
        )}

        {nextAppt ? (
          <Pressable
            style={styles.nextCard}
            onPress={() => router.push("/(doctor)/calendrier")}
          >
            <Text style={styles.nextLabel}>{t("doctor.home.nextAppointment")}</Text>
            <View style={styles.nextBody}>
              <View style={styles.nextTime}>
                <Text style={styles.nextTimeText}>
                  {new Date(nextAppt.startsAt).toLocaleTimeString(locale === "ar" ? "ar-TN" : "fr-FR", {
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
            <Text style={styles.emptyTitle}>{t("doctor.home.freeDay")}</Text>
            <Text style={styles.emptySub}>
              {t("doctor.home.noAppointmentsToday")}
            </Text>
          </View>
        ) : null}

        <QuickAccess />

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>{t("doctor.home.weeklyChart")}</Text>
            <Text style={styles.chartTotal}>
              {weeklyCounts.reduce((s, c) => s + c.count, 0)} {t("doctor.home.total")}
            </Text>
          </View>
          <BarChart data={weeklyCounts} />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>{t("doctor.home.monthlyStatus")}</Text>
          </View>
          <StatusDonut distribution={statusDistribution} />
        </View>

        {/* Mon équipe */}
        {secretaries.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t("doctor.home.myTeam")}</Text>
              <Pressable onPress={() => router.push("/(doctor)/more/secretaires" as never)}>
                <Text style={styles.seeAll}>{t("doctor.home.manage")}</Text>
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
                  <Text style={styles.teamName}>{t("doctor.home.others")}</Text>
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
              <Text style={styles.planLabel}>{t("doctor.home.currentPlan")}</Text>
              <Text style={styles.planName}>{billing.plan}</Text>
              {billing.renewsAt && (
                <Text style={styles.planRenew}>
                  {t("doctor.home.renewal")}{" "}
                  {new Date(billing.renewsAt).toLocaleDateString(locale === "ar" ? "ar-TN" : "fr-FR", { day: "numeric", month: "long" })}
                </Text>
              )}
            </View>
            <View style={styles.planSms}>
              <Text style={styles.planSmsValue}>
                {billing.smsLimit >= 999999 ? "∞" : `${billing.smsUsed}/${billing.smsLimit}`}
              </Text>
              <Text style={styles.planSmsLabel}>{t("doctor.home.sms")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.foregroundSecondary} />
          </Pressable>
        )}

        {/* Recent activity feed (web parity) */}
        {dashboard && dashboard.recentActivity.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.sectionTitle}>{t("doctor.home.recentActivity")}</Text>
            <View style={styles.activityList}>
              {dashboard.recentActivity.slice(0, 6).map((it) => (
                <ActivityRow key={it.id} item={it} />
              ))}
            </View>
          </View>
        )}

        {todayAppts.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.sectionTitle}>{t("doctor.home.todayAgenda")}</Text>
            {todayAppts.slice(0, 5).map((a) => (
              <ApptRow key={a.id} appt={a} />
            ))}
            {todayAppts.length > 5 && (
              <Pressable
                onPress={() => router.push("/(doctor)/calendrier")}
                style={styles.moreBtn}
              >
                <Text style={styles.moreBtnText}>
                  {t("doctor.home.seeMore")}{todayAppts.length - 5} {t("doctor.home.others")}
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

function BigKpi({
  icon,
  label,
  value,
  sub,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  sub?: string;
  tone: "teal" | "green" | "live" | "neutral";
  onPress?: () => void;
}) {
  const toneColors: Record<"teal" | "green" | "live" | "neutral", { bg: string; fg: string; dot?: string }> = {
    teal: { bg: `${colors.teal}15`, fg: colors.teal },
    green: { bg: "#DCFCE7", fg: "#15803D" },
    live: { bg: "#FEE2E2", fg: "#B91C1C", dot: "#EF4444" },
    neutral: { bg: colors.bgSecondary, fg: colors.foreground },
  };
  const c = toneColors[tone];
  const body = (
    <>
      <View style={styles.bigKpiHead}>
        <Ionicons name={icon} size={16} color={c.fg} />
        {c.dot && <View style={[styles.liveDot, { backgroundColor: c.dot }]} />}
      </View>
      <Text style={[styles.bigKpiValue, { color: c.fg }]}>{value}</Text>
      <Text style={styles.bigKpiLabel} numberOfLines={1}>
        {label}
      </Text>
      {sub ? (
        <Text style={[styles.bigKpiSub, { color: c.fg }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable style={[styles.bigKpi, { backgroundColor: c.bg }]} onPress={onPress}>
        {body}
      </Pressable>
    );
  }
  return <View style={[styles.bigKpi, { backgroundColor: c.bg }]}>{body}</View>;
}

function SmsCard({ sms }: { sms: { used: number; limit: number; plan: string } }) {
  const unlimited = sms.limit >= 999999;
  const pct = unlimited ? 0 : Math.min(100, Math.round((sms.used / Math.max(1, sms.limit)) * 100));
  let barColor: string = colors.green;
  if (pct >= 90) barColor = colors.danger;
  else if (pct >= 70) barColor = colors.amber;
  const remaining = unlimited ? 0 : Math.max(0, sms.limit - sms.used);

  return (
    <View style={styles.smsCard}>
      <View style={styles.smsHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.smsTitle}>{t("doctor.home.smsUsageTitle")}</Text>
          <Text style={styles.smsSub}>
            {unlimited
              ? t("doctor.home.smsUsageUnlimited")
              : remaining > 0
              ? t("doctor.home.smsRemaining", { count: remaining })
              : t("doctor.home.smsExhausted")}
          </Text>
        </View>
        <Text style={[styles.smsCount, { color: barColor }]}>
          {unlimited ? `${sms.used}` : `${sms.used} / ${sms.limit}`}
        </Text>
      </View>
      {!unlimited && (
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]}
          />
        </View>
      )}
    </View>
  );
}

function CompletionRateCard({
  rate,
  completed,
  noShows,
}: {
  rate: number | null;
  completed: number;
  noShows: number;
}) {
  const total = completed + noShows;
  if (rate === null) {
    return (
      <View style={styles.smsCard}>
        <Text style={styles.smsTitle}>{t("doctor.home.completionRateTitle")}</Text>
        <Text style={styles.smsSub}>{t("doctor.home.completionRateEmpty")}</Text>
      </View>
    );
  }
  let barColor: string = colors.green;
  if (rate < 60) barColor = colors.danger;
  else if (rate < 80) barColor = colors.amber;
  return (
    <View style={styles.smsCard}>
      <View style={styles.smsHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.smsTitle}>{t("doctor.home.completionRateTitle")}</Text>
          <Text style={styles.smsSub}>
            {t("doctor.home.completionRateSub", { completed, total })}
          </Text>
        </View>
        <Text style={[styles.smsCount, { color: barColor }]}>{rate}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${rate}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { locale } = useLocale();
  const labelMap: Record<string, { icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; key: string }> = {
    completed: { icon: "checkmark-circle", color: "#16A34A", key: "doctor.home.activityCompleted" },
    confirmed: { icon: "calendar", color: colors.teal, key: "doctor.home.activityConfirmed" },
    pending: { icon: "time", color: "#B45309", key: "doctor.home.activityPending" },
    cancelled: { icon: "close-circle", color: "#6B7280", key: "doctor.home.activityCancelled" },
    no_show: { icon: "alert-circle", color: "#B91C1C", key: "doctor.home.activityNoShow" },
  };
  const cfg = labelMap[item.status] ?? labelMap.confirmed;
  const updated = new Date(item.updatedAt);
  const diffMin = Math.max(0, Math.floor((Date.now() - updated.getTime()) / 60000));
  let timeAgo: string;
  if (diffMin < 1) timeAgo = t("doctor.home.justNow");
  else if (diffMin < 60) timeAgo = t("doctor.home.ago", { value: t("doctor.home.minutesShort", { n: diffMin }) });
  else if (diffMin < 60 * 24)
    timeAgo = t("doctor.home.ago", { value: t("doctor.home.hoursShort", { n: Math.floor(diffMin / 60) }) });
  else
    timeAgo = t("doctor.home.ago", { value: t("doctor.home.daysShort", { n: Math.floor(diffMin / (60 * 24)) }) });

  // locale only consumed by Date.toLocaleString in alternate UIs — referenced to satisfy lint
  void locale;

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: `${cfg.color}1A` }]}>
        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityLabel}>
          {t(cfg.key)} — {item.patientName}
        </Text>
        <Text style={styles.activityTime}>{timeAgo}</Text>
      </View>
    </View>
  );
}

function QuickAccess() {
  const items: Array<{ icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; path: string }> = [
    { icon: "calendar-number", label: t("doctor.home.appointments"), path: "/(doctor)/more/rendez-vous" },
    { icon: "stats-chart", label: t("doctor.home.stats"), path: "/(doctor)/more/stats" },
    { icon: "wallet", label: t("doctor.home.wallet"), path: "/(doctor)/more/wallet" },
    { icon: "person", label: t("doctor.home.myProfile"), path: "/(doctor)/more/profil" },
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
  const max = Math.max(1, ...data.map((d) => d.count));
  const DOW = ["D", "L", "M", "M", "J", "V", "S"];
  const todayStr = new Date().toDateString();

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, gap: 4, paddingHorizontal: 4 }}>
      {data.map((d, i) => {
        const isToday = d.date.toDateString() === todayStr;
        const barH = Math.max(4, (72 * d.count) / max);
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
            {d.count > 0 && (
              <Text style={{ fontSize: 9, fontWeight: "700", color: colors.foreground }}>
                {d.count}
              </Text>
            )}
            <View
              style={{
                width: "100%",
                height: barH,
                borderRadius: 4,
                backgroundColor: isToday ? colors.teal : colors.tealLight,
              }}
            />
            <Text style={{ fontSize: 10, color: colors.foregroundSecondary }}>
              {DOW[d.date.getDay()]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StatusDonut({ distribution }: { distribution: Record<string, number> }) {
  const statusLabels = getStatusLabels();
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  const entries = Object.entries(distribution).sort(([, a], [, b]) => b - a);
  const size = 130;
  const cx = size / 2;
  const cy = size / 2;
  const r = 48;
  const strokeW = 18;

  let startAngle = -Math.PI / 2;
  const segments = entries.map(([status, count]) => {
    const frac = count / (total || 1);
    const endAngle = startAngle + frac * Math.PI * 2;
    const x1 = cx + Math.cos(startAngle) * r;
    const y1 = cy + Math.sin(startAngle) * r;
    const x2 = cx + Math.cos(endAngle) * r;
    const y2 = cy + Math.sin(endAngle) * r;
    const largeArc = frac > 0.5 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    startAngle = endAngle;
    return { status, count, d, color: STATUS_TONES[status]?.fg ?? colors.teal };
  });

  return (
    <View style={styles.donutRow}>
      {total === 0 ? (
        <Text style={styles.emptyText}>{t("common.noData")}</Text>
      ) : (
        <>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={strokeW} fill="none" />
            {segments.map((s, i) => (
              <Path key={i} d={s.d} stroke={s.color} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
            ))}
            <SvgText x={cx} y={cy - 4} fontSize={20} textAnchor="middle" fill={colors.foreground} fontWeight="800">
              {total}
            </SvgText>
            <SvgText x={cx} y={cy + 13} fontSize={9} textAnchor="middle" fill={colors.foregroundSecondary}>
              {t("doctor.home.rdv")}
            </SvgText>
          </Svg>
          <View style={{ flex: 1, gap: 5 }}>
            {segments.map((s) => (
              <View key={s.status} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.legendLabel}>{statusLabels[s.status] ?? s.status}</Text>
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
  const statusLabels = getStatusLabels();
  const { locale } = useLocale();
  const start = new Date(appt.startsAt);
  const hhmm = start.toLocaleTimeString(locale === "ar" ? "ar-TN" : "fr-FR", {
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
          {statusLabels[appt.status] ?? appt.status}
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

  kpiScrollRow: { gap: spacing.sm, paddingRight: spacing.sm },
  bigKpi: {
    width: 140,
    padding: spacing.md,
    borderRadius: radii.xl,
    gap: 2,
  },
  bigKpiHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bigKpiValue: { fontSize: 24, fontWeight: "800", marginTop: 4 },
  bigKpiLabel: { fontSize: 11, fontWeight: "600", color: colors.foreground, marginTop: 2 },
  bigKpiSub: { fontSize: 10, fontWeight: "700", marginTop: 2, opacity: 0.85 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },

  smsCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  smsHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  smsTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  smsSub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  smsCount: { fontSize: 16, fontWeight: "800" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  activityList: { gap: spacing.xs },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  activityLabel: { fontSize: 13, color: colors.foreground, fontWeight: "600" },
  activityTime: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
});
