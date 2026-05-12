import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patientName: string;
  patientPhone: string;
  reason: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#D97706",
  confirmed: "#0891B2",
  completed: "#059669",
  cancelled: "#6B7280",
  no_show: "#DC2626",
};


function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function SecretaryDashboard() {
  const { locale } = useLocale();

  const STATUS_LABEL: Record<string, string> = {
    pending: t("secretary.dashboard.statusToConfirm"),
    confirmed: t("secretary.dashboard.statusConfirmed"),
    completed: t("secretary.dashboard.statusCompleted"),
    cancelled: t("secretary.dashboard.statusCancelled"),
    no_show: t("secretary.dashboard.statusAbsent"),
  };

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now] = useState(new Date());
  // Waiting-room counter — shared with the doctor in real time.
  const [waitingCount, setWaitingCount] = useState(0);
  const [waitingBusy, setWaitingBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const today = now.toISOString().split("T")[0];
      const data = await api<Appointment[]>(`/api/appointments/doctor?from=${today}T00:00:00&to=${today}T23:59:59`, { noRedirect: true });
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
    // Best-effort refresh of the waiting-room counter alongside the
    // appointments fetch so the dashboard renders consistent data.
    try {
      const wr = await api<{ count: number }>(`/api/doctor/waiting-room`, { noRedirect: true });
      if (typeof wr?.count === "number") setWaitingCount(wr.count);
    } catch {
      /* ignore — keep last known value */
    }
  }, [now]);

  const updateWaiting = useCallback(async (op: "inc" | "dec" | "set", value?: number) => {
    if (waitingBusy) return;
    setWaitingBusy(true);
    // Optimistic update — flip back on failure.
    const prev = waitingCount;
    const next =
      op === "inc" ? Math.min(prev + 1, 50)
      : op === "dec" ? Math.max(prev - 1, 0)
      : Math.max(0, Math.min(value ?? 0, 50));
    setWaitingCount(next);
    try {
      const r = await api<{ count: number }>(`/api/doctor/waiting-room`, {
        method: "PATCH",
        body: JSON.stringify(op === "set" ? { op, value: next } : { op }),
        noRedirect: true,
      });
      if (typeof r?.count === "number") setWaitingCount(r.count);
    } catch {
      setWaitingCount(prev);
    } finally {
      setWaitingBusy(false);
    }
  }, [waitingBusy, waitingCount]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayAppts = appointments
    .filter((a) => isToday(a.startsAt))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const pending = todayAppts.filter((a) => a.status === "pending").length;
  const confirmed = todayAppts.filter((a) => a.status === "confirmed").length;
  const noShow = todayAppts.filter((a) => a.status === "no_show").length;

  const todayStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      >
        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.greeting}>{t("secretary.dashboard.title")}</Text>
          <Text style={styles.dateText} numberOfLines={1}>{todayStr}</Text>
        </View>

        {/* KPI cards */}
        <View style={styles.kpiRow}>
          <KpiCard label={t("secretary.dashboard.today")} value={todayAppts.length} icon="calendar" iconColor={colors.teal} />
          <KpiCard label={t("secretary.dashboard.toConfirm")} value={pending} icon="time-outline" iconColor="#D97706" />
          <KpiCard label={t("secretary.dashboard.confirmed")} value={confirmed} icon="checkmark-circle-outline" iconColor="#059669" />
          <KpiCard label={t("secretary.dashboard.absences")} value={noShow} icon="alert-circle-outline" iconColor="#DC2626" />
        </View>

        {/* Waiting room counter */}
        <View style={styles.waitingCard}>
          <View style={styles.waitingHeader}>
            <Ionicons name="people" size={18} color={colors.teal} />
            <Text style={styles.waitingTitle}>{t("secretary.dashboard.waitingRoom")}</Text>
          </View>
          <Text style={styles.waitingHint}>{t("secretary.dashboard.waitingHint")}</Text>
          <View style={styles.waitingControls}>
            <Pressable
              onPress={() => updateWaiting("dec")}
              disabled={waitingBusy || waitingCount === 0}
              style={({ pressed }) => [
                styles.waitingBtn,
                (waitingCount === 0 || waitingBusy) && styles.waitingBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="remove" size={26} color={colors.foreground} />
            </Pressable>
            <View style={styles.waitingValueBox}>
              <Text style={styles.waitingValue}>{waitingCount}</Text>
              <Text style={styles.waitingValueLabel}>
                {waitingCount === 1
                  ? t("secretary.dashboard.waitingPatientSingular")
                  : t("secretary.dashboard.waitingPatientPlural")}
              </Text>
            </View>
            <Pressable
              onPress={() => updateWaiting("inc")}
              disabled={waitingBusy || waitingCount >= 50}
              style={({ pressed }) => [
                styles.waitingBtn,
                styles.waitingBtnPrimary,
                (waitingCount >= 50 || waitingBusy) && styles.waitingBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="add" size={26} color="#fff" />
            </Pressable>
          </View>
          {waitingCount > 0 ? (
            <Pressable
              onPress={() => updateWaiting("set", 0)}
              disabled={waitingBusy}
              style={({ pressed }) => [styles.waitingReset, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="refresh" size={13} color={colors.foregroundSecondary} />
              <Text style={styles.waitingResetText}>{t("secretary.dashboard.waitingReset")}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Today's schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("secretary.dashboard.planningSection")}</Text>

          {todayAppts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color={colors.border} />
              <Text style={styles.emptyText}>{t("secretary.dashboard.noAppointments")}</Text>
            </View>
          ) : (
            <View style={styles.timelineCard}>
              {todayAppts.map((appt, i) => {
                const time = new Date(appt.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                const color = STATUS_COLOR[appt.status] ?? colors.foregroundSecondary;
                return (
                  <View key={appt.id} style={[styles.timelineRow, i > 0 && styles.timelineRowBorder]}>
                    <Text style={[styles.timelineTime, { color }]}>{time}</Text>
                    <View style={[styles.timelineDot, { backgroundColor: color }]} />
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineTop}>
                        <Text style={styles.patientName}>{appt.patientName}</Text>
                        <View style={[styles.badge, { borderColor: color }]}>
                          <Text style={[styles.badgeText, { color }]}>{STATUS_LABEL[appt.status] ?? appt.status}</Text>
                        </View>
                      </View>
                      {appt.reason && <Text style={styles.reason} numberOfLines={1}>{appt.reason}</Text>}
                      {appt.patientPhone ? (
                        <Pressable onPress={() => Linking.openURL(`tel:${appt.patientPhone}`)}>
                          <Text style={styles.phone}>{appt.patientPhone}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({ label, value, icon, iconColor }: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing["3xl"], gap: spacing.xl },
  headerBlock: { gap: 4 },
  greeting: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  dateText: { fontSize: 13, color: colors.foregroundSecondary, textTransform: "capitalize" },
  kpiRow: { flexDirection: "row", gap: spacing.sm },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: "center",
    gap: 4,
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  kpiLabel: { fontSize: 10, color: colors.foregroundSecondary, textAlign: "center" },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary },
  timelineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  timelineRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineTime: { fontSize: 13, fontWeight: "700", width: 42, paddingTop: 2 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  timelineContent: { flex: 1, gap: 2 },
  timelineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  patientName: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  badge: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  reason: { fontSize: 12, color: colors.foregroundSecondary },
  phone: { fontSize: 12, color: colors.teal, fontWeight: "600" },
  waitingCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  waitingHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  waitingTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  waitingHint: { fontSize: 12, color: colors.foregroundSecondary },
  waitingControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  waitingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  waitingBtnPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  waitingBtnDisabled: { opacity: 0.4 },
  waitingValueBox: { flex: 1, alignItems: "center" },
  waitingValue: { fontSize: 40, fontWeight: "800", color: colors.foreground, lineHeight: 44 },
  waitingValueLabel: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  waitingReset: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  waitingResetText: { fontSize: 12, color: colors.foregroundSecondary, fontWeight: "600" },
});
