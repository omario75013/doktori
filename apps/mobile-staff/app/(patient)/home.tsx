import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  doctorName: string;
  doctorSpecialty: string;
};

type Patient = { id: string; name: string | null; email?: string | null };

async function getPatientToken(): Promise<string | null> {
  const SecureStore = await import("expo-secure-store").catch(() => null);
  return SecureStore ? SecureStore.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function firstNameOf(name: string | null | undefined): string {
  if (!name) return "";
  return name.split(" ")[0] ?? "";
}

export default function PatientHome() {
  useLocale();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [nextAppt, setNextAppt] = useState<Appointment | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number>(0);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const token = await getPatientToken();
      if (!token) return;
      const [me, appts] = await Promise.all([
        api<Patient>("/api/patients/me", { token }).catch(() => null),
        api<Appointment[]>("/api/appointments/patient", { token }).catch(() => [] as Appointment[]),
      ]);
      if (me) setPatient(me);
      const upcoming = (appts ?? []).filter(
        (a) => a.status !== "cancelled" && new Date(a.startsAt) > new Date()
      );
      setNextAppt(upcoming[0] ?? null);
      setUpcomingCount(upcoming.length);
      // best-effort notif count
      try {
        const notifs = await api<Array<{ readAt?: string | null }>>(
          "/api/notifications/patient",
          { token }
        );
        setUnreadNotifs(notifs.filter((n) => !n.readAt).length);
      } catch {
        /* ignore */
      }
    } catch {
      // silent fail
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  function openSos() {
    Alert.alert(t("patient.home.sosTitle"), t("patient.home.sosBody"), [
      {
        text: t("patient.home.sosCallSamu"),
        onPress: () => Linking.openURL("tel:190").catch(() => undefined),
      },
      {
        text: t("patient.home.sosCallDoctor"),
        onPress: () => router.push("/(patient)/rendez-vous"),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  function formatDatePill(iso: string) {
    const d = new Date(iso);
    const day = d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
    const num = d.toLocaleDateString("fr-FR", { day: "2-digit" });
    const month = d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return { day, num, month, time };
  }

  const firstName = firstNameOf(patient?.name);
  const initials = initialsOf(patient?.name);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
        }
      >
        {/* Teal header */}
        <SafeAreaView edges={["top"]} style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              onPress={() => router.push("/(patient)/profil")}
              style={styles.avatar}
              accessibilityRole="button"
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.helloSmall}>
                {t("patient.home.helloSmall")}
                {firstName ? `, ${firstName}` : ""}
              </Text>
              <Text style={styles.helloName} numberOfLines={1}>
                {patient?.name ?? t("patient.home.welcome")}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(patient)/notifications")}
              style={styles.bellBtn}
              accessibilityLabel="notifications"
            >
              <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
              {unreadNotifs > 0 && <View style={styles.bellDot} />}
            </Pressable>
          </View>

          <Text style={styles.headerTitle}>{t("patient.home.heroTitle")}</Text>
          <Text style={styles.headerSub}>{t("patient.home.heroSub")}</Text>

          <Pressable
            onPress={() => router.push("/(patient)/recherche")}
            style={styles.searchBar}
          >
            <Ionicons name="search-outline" size={18} color={colors.foregroundSecondary} />
            <Text style={styles.searchPh}>{t("patient.home.searchPlaceholder")}</Text>
            <View style={styles.kbdHint}>
              <Text style={styles.kbdText}>⌘K</Text>
            </View>
          </Pressable>
        </SafeAreaView>

        {/* 2×2 action grid */}
        <View style={styles.grid}>
          <ActionCard
            iconName="calendar-outline"
            iconBg={colors.bgSecondary}
            iconColor={colors.teal}
            title={t("patient.home.cardRdvTitle")}
            subtitle={t("patient.home.cardRdvSub", { count: upcomingCount })}
            onPress={() => router.push("/(patient)/rendez-vous")}
          />
          <ActionCard
            iconName="videocam-outline"
            iconBg={colors.bgSecondary}
            iconColor={colors.teal}
            title={t("patient.home.cardVideoTitle")}
            subtitle={t("patient.home.cardVideoSub")}
            onPress={() => router.push("/(patient)/rendez-vous")}
          />
          <ActionCard
            iconName="folder-outline"
            iconBg={colors.bgSecondary}
            iconColor={colors.teal}
            title={t("patient.home.cardDossierTitle")}
            subtitle={t("patient.home.cardDossierSub")}
            onPress={() => router.push("/(patient)/dossier-medical")}
          />
          <ActionCard
            iconName="sunny-outline"
            iconBg="#FFF1E6"
            iconColor="#F97316"
            title={t("patient.home.cardSosTitle")}
            subtitle={t("patient.home.cardSosSub")}
            onPress={openSos}
          />
        </View>

        {/* Next appointment */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("patient.home.nextRdvLabel")}</Text>
          {nextAppt ? (
            <Pressable
              style={styles.apptCard}
              onPress={() => router.push("/(patient)/rendez-vous")}
            >
              {(() => {
                const p = formatDatePill(nextAppt.startsAt);
                return (
                  <View style={styles.datePill}>
                    <Text style={styles.datePillDay}>{p.day}</Text>
                    <Text style={styles.datePillNum}>{p.num}</Text>
                    <Text style={styles.datePillMonth}>{p.month}</Text>
                  </View>
                );
              })()}
              <View style={{ flex: 1 }}>
                <Text style={styles.apptDoctor} numberOfLines={1}>
                  {nextAppt.doctorName}
                </Text>
                <Text style={styles.apptSpec} numberOfLines={1}>
                  {nextAppt.doctorSpecialty}
                </Text>
                <View style={styles.apptTimeRow}>
                  <Ionicons name="time-outline" size={13} color={colors.foregroundSecondary} />
                  <Text style={styles.apptTime}>
                    {new Date(nextAppt.startsAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {"  ·  "}
                    {Math.max(
                      15,
                      Math.round(
                        (new Date(nextAppt.endsAt).getTime() -
                          new Date(nextAppt.startsAt).getTime()) /
                          60000
                      )
                    )}{" "}
                    min
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.foregroundSecondary} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.emptyAppt}
              onPress={() => router.push("/(patient)/recherche")}
            >
              <Ionicons name="calendar-outline" size={28} color={colors.foregroundSecondary} />
              <Text style={styles.emptyApptText}>{t("patient.home.noNextRdv")}</Text>
              <Text style={styles.emptyApptCta}>{t("patient.home.bookNow")}</Text>
            </Pressable>
          )}
        </View>

        {/* Mon profil santé */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("patient.profilHealth.label")}</Text>
        </View>
        <View style={[styles.grid, { marginTop: 0 }]}>
          <ActionCard
            iconName="person-outline"
            iconBg={colors.bgSecondary}
            iconColor={colors.teal}
            title={t("patient.profilHealth.profil")}
            subtitle={t("patient.profilHealth.profilSub")}
            onPress={() => router.push("/(patient)/profil")}
          />
          <ActionCard
            iconName="medkit-outline"
            iconBg={colors.bgSecondary}
            iconColor={colors.teal}
            title={t("patient.profilHealth.traitements")}
            subtitle={t("patient.profilHealth.traitementsSub")}
            onPress={() => router.push("/(patient)/dossier-medical")}
          />
          <ActionCard
            iconName="document-text-outline"
            iconBg={colors.bgSecondary}
            iconColor={colors.teal}
            title={t("patient.profilHealth.ordonnances")}
            subtitle={t("patient.profilHealth.ordonnancesSub")}
            onPress={() => router.push("/(patient)/ordonnances")}
          />
          <ActionCard
            iconName="shield-checkmark-outline"
            iconBg={colors.bgSecondary}
            iconColor={colors.teal}
            title={t("patient.profilHealth.vaccins")}
            subtitle={t("patient.profilHealth.vaccinsSub")}
            onPress={() => router.push("/(patient)/dossier-medical")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ActionCard({
  iconName,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["2xl"] + spacing.md,
    borderBottomLeftRadius: radii["2xl"],
    borderBottomRightRadius: radii["2xl"],
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  helloSmall: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500" },
  helloName: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginTop: 1 },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: spacing.xl,
  },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPh: { flex: 1, color: colors.foregroundSecondary, fontSize: 14 },
  kbdHint: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.bgSecondary,
  },
  kbdText: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xl,
    gap: spacing.md,
  },
  card: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  cardSub: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  apptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePill: {
    width: 64,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  datePillDay: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.teal,
    textTransform: "uppercase",
  },
  datePillNum: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.foreground,
    lineHeight: 22,
    marginTop: 2,
  },
  datePillMonth: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
  },
  apptDoctor: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  apptSpec: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  apptTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  apptTime: { fontSize: 12, color: colors.foregroundSecondary },
  emptyAppt: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  emptyApptText: { fontSize: 13, color: colors.foregroundSecondary },
  emptyApptCta: { fontSize: 13, fontWeight: "700", color: colors.teal },
});
