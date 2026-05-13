import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  doctorName: string;
  doctorSpecialty: string;
};

type NotificationItem = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  message: string;
  date: string;
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function appointmentToNotification(appt: Appointment): NotificationItem | null {
  const name = appt.doctorName;
  switch (appt.status) {
    case "confirmed":
      return {
        id: `${appt.id}-confirmed`,
        icon: "checkmark-circle",
        iconColor: colors.teal,
        message: `Votre RDV avec Dr. ${name} a été confirmé`,
        date: appt.startsAt,
      };
    case "cancelled":
      return {
        id: `${appt.id}-cancelled`,
        icon: "close-circle",
        iconColor: colors.danger,
        message: `Votre RDV avec Dr. ${name} a été annulé`,
        date: appt.startsAt,
      };
    case "reschedule_requested":
      return {
        id: `${appt.id}-reschedule`,
        icon: "time",
        iconColor: "#B45309",
        message: `Votre demande de décalage avec Dr. ${name} est en cours`,
        date: appt.startsAt,
      };
    case "cancel_requested":
      return {
        id: `${appt.id}-cancel-req`,
        icon: "alert-circle",
        iconColor: "#B91C1C",
        message: `Votre demande d'annulation avec Dr. ${name} est en cours`,
        date: appt.startsAt,
      };
    case "completed":
      return {
        id: `${appt.id}-completed`,
        icon: "checkmark-done-circle",
        iconColor: "#3B82F6",
        message: `Votre consultation avec Dr. ${name} est terminée`,
        date: appt.startsAt,
      };
    default:
      return null;
  }
}

export default function PatientNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const token = await getPatientToken();
      const data = await api<Appointment[]>("/api/appointments/patient", {
        token: token ?? undefined,
      });
      const items: NotificationItem[] = data
        .map(appointmentToNotification)
        .filter((n): n is NotificationItem => n !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(items);
    } catch {
      setError("Impossible de charger vos notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/plus-menu" as never);
      return true;
    });
    return () => sub.remove();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Group into recent (last 7 days) and older
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = notifications.filter((n) => new Date(n.date).getTime() >= sevenDaysAgo);
  const older = notifications.filter((n) => new Date(n.date).getTime() < sevenDaysAgo);

  const sections: { title: string; data: NotificationItem[] }[] = [];
  if (recent.length > 0) sections.push({ title: "Récentes", data: recent });
  if (older.length > 0) sections.push({ title: "Anciennes", data: older });

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(patient)/plus-menu" as never)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubText}>
            Vous recevrez des alertes sur vos rendez-vous ici.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.notifItem}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.iconColor}18` }]}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={styles.notifBody}>
                <Text style={styles.notifMessage}>{item.message}</Text>
                <Text style={styles.notifDate}>{formatDate(item.date)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  listContent: { paddingBottom: spacing["3xl"] },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.bg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifBody: { flex: 1, gap: 3 },
  notifMessage: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  notifDate: { fontSize: 12, color: colors.foregroundSecondary },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary },
  emptySubText: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  retryText: { color: "#FFF", fontWeight: "700" },
});
