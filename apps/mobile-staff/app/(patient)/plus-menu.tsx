import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Patient = { id: string; name: string | null; email?: string | null };

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Row = {
  key: string;
  label: string;
  icon: IconName;
  to: string;
};

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

export default function PatientPlusMenu() {
  useLocale();
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getPatientToken();
        if (!token) return;
        const me = await api<Patient>("/api/patients/me", { token }).catch(() => null);
        if (me) setPatient(me);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const rows: Row[] = [
    { key: "favoris", label: t("patient.plusMenu.favoris"), icon: "heart-outline", to: "/(patient)/favoris" },
    { key: "famille", label: t("patient.plusMenu.famille"), icon: "people-outline", to: "/(patient)/ma-famille" },
    { key: "documents", label: t("patient.plusMenu.documents"), icon: "folder-outline", to: "/(patient)/mes-documents" },
    { key: "parrainage", label: t("patient.plusMenu.parrainage"), icon: "gift-outline", to: "/(patient)/mon-parrainage" },
    { key: "recherche", label: t("patient.plusMenu.recherche"), icon: "search-outline", to: "/(patient)/recherche" },
    { key: "comparer", label: t("patient.plusMenu.comparer"), icon: "git-compare-outline", to: "/(patient)/comparer" },
    { key: "coachIa", label: t("patient.plusMenu.coachIa"), icon: "sparkles-outline", to: "/(patient)/coach-ia" },
    { key: "domicile", label: t("patient.plusMenu.domicile"), icon: "home-outline", to: "/(patient)/domicile" },
    { key: "parametres", label: t("patient.plusMenu.parametres"), icon: "settings-outline", to: "/(patient)/parametres" },
    { key: "notifications", label: t("patient.plusMenu.notifications"), icon: "notifications-outline", to: "/(patient)/notifications" },
  ];

  function logout() {
    Alert.alert(
      t("patient.plusMenu.logoutConfirmTitle"),
      t("patient.plusMenu.logoutConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("patient.plusMenu.logout"),
          style: "destructive",
          onPress: async () => {
            const SS = await import("expo-secure-store");
            await SS.deleteItemAsync(PATIENT_TOKEN_KEY);
            router.replace("/(auth)/patient-login");
          },
        },
      ]
    );
  }

  const initials = initialsOf(patient?.name);

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("patient.plusMenu.title")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile preview card */}
        <Pressable
          style={styles.profileCard}
          onPress={() => router.push("/(patient)/profil")}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {patient?.name ?? "—"}
            </Text>
            {patient?.email ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {patient.email}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.foregroundSecondary} />
        </Pressable>

        {/* Rows */}
        <View style={styles.card}>
          {rows.map((r, i) => (
            <View key={r.key}>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(r.to as never)}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={r.icon} size={20} color={colors.teal} />
                </View>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.foregroundSecondary} />
              </Pressable>
              {i < rows.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        {/* Logout */}
        <View style={[styles.card, { marginTop: spacing.lg }]}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={logout}
          >
            <View style={[styles.rowIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.danger, fontWeight: "700" }]}>
              {t("patient.plusMenu.logout")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  profileName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  profileEmail: { fontSize: 13, color: colors.foregroundSecondary, marginTop: 2 },
  card: {
    marginHorizontal: spacing.xl,
    backgroundColor: "#FFFFFF",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: "500" },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
});
