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
import { colors, spacing, radii, api } from "@doktori/mobile-core";

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

const STATUS_LABEL: Record<string, string> = {
  pending: "À confirmer",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function SecretaryDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now] = useState(new Date());

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
  }, [now]);

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
          <Text style={styles.greeting}>Tableau de bord</Text>
          <Text style={styles.dateText} numberOfLines={1}>{todayStr}</Text>
        </View>

        {/* KPI cards */}
        <View style={styles.kpiRow}>
          <KpiCard label="Aujourd'hui" value={todayAppts.length} icon="calendar" iconColor={colors.teal} />
          <KpiCard label="À confirmer" value={pending} icon="time-outline" iconColor="#D97706" />
          <KpiCard label="Confirmés" value={confirmed} icon="checkmark-circle-outline" iconColor="#059669" />
          <KpiCard label="Absences" value={noShow} icon="alert-circle-outline" iconColor="#DC2626" />
        </View>

        {/* Today's schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Planning du jour</Text>

          {todayAppts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={36} color={colors.border} />
              <Text style={styles.emptyText}>Aucun rendez-vous aujourd'hui</Text>
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
});
