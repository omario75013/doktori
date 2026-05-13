import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";
const WEB_ORIGIN = "https://doktori.tn";

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

type TeleconsultData = {
  roomName: string;
  roomUrl: string;
  startedAt: string | null;
  endedAt: string | null;
  doctorName: string | null;
  scheduledAt: string | Date | null;
};

export default function PatientTeleconsultRoom() {
  useLocale();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeleconsultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    setError(null);
    try {
      const token = await getPatientToken();
      const res = await api<TeleconsultData>(`/api/teleconsult/${appointmentId}`, {
        token: token ?? undefined,
      });
      setData(res);
    } catch {
      setError(t("patient.teleconsult.notFound"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  function formatDate(value: string | Date | null): string {
    if (!value) return "";
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function openRoom() {
    const webUrl = `${WEB_ORIGIN}/teleconsult/${appointmentId}`;
    try {
      const supported = await Linking.canOpenURL(webUrl);
      if (supported) {
        await Linking.openURL(webUrl);
      } else if (data?.roomUrl) {
        await Linking.openURL(data.roomUrl);
      } else {
        throw new Error("no-url");
      }
    } catch {
      Alert.alert(
        t("patient.teleconsult.openFailed"),
        t("patient.teleconsult.openingHint"),
      );
    }
  }

  const isEnded = !!data?.endedAt;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("patient.teleconsult.title")}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.loadingText}>{t("patient.teleconsult.loading")}</Text>
        </View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Ionicons name="videocam-off-outline" size={56} color={colors.border} />
          <Text style={styles.errorTitle}>{t("patient.teleconsult.notFound")}</Text>
          <Text style={styles.errorDesc}>{t("patient.teleconsult.notFoundDesc")}</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>{t("patient.teleconsult.back")}</Text>
          </Pressable>
        </View>
      ) : isEnded ? (
        <View style={styles.center}>
          <View style={styles.endedBadge}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={styles.endedTitle}>{t("patient.teleconsult.ended")}</Text>
          <Text style={styles.errorDesc}>{t("patient.teleconsult.endedDesc")}</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => Linking.openURL(`${WEB_ORIGIN}/avis/${appointmentId}`)}
          >
            <Ionicons name="star-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{t("patient.teleconsult.leaveReview")}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>{t("patient.teleconsult.close")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="videocam" size={32} color={colors.teal} />
            </View>
            {data.doctorName ? (
              <Text style={styles.heroDoctor}>
                {t("patient.teleconsult.with", { name: data.doctorName })}
              </Text>
            ) : null}
            {data.scheduledAt ? (
              <Text style={styles.heroSchedule}>
                {t("patient.teleconsult.scheduledFor", { date: formatDate(data.scheduledAt) })}
              </Text>
            ) : null}
            <Text style={styles.heroHeading}>{t("patient.teleconsult.heading")}</Text>
            <Text style={styles.heroIntro}>{t("patient.teleconsult.intro")}</Text>
          </View>

          {/* Join button */}
          <Pressable style={styles.primaryBtn} onPress={openRoom}>
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{t("patient.teleconsult.openButton")}</Text>
          </Pressable>

          <Text style={styles.hint}>{t("patient.teleconsult.openingHint")}</Text>

          {/* Web best-experience note */}
          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.teal} />
            <Text style={styles.noteText}>{t("patient.teleconsult.webBestExp")}</Text>
          </View>

          {/* Tips */}
          <Text style={styles.tipsTitle}>{t("patient.teleconsult.tipsTitle")}</Text>
          <View style={styles.tipsList}>
            {[
              t("patient.teleconsult.tip1"),
              t("patient.teleconsult.tip2"),
              t("patient.teleconsult.tip3"),
              t("patient.teleconsult.tip4"),
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.teal} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.foreground },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  loadingText: { color: colors.foregroundSecondary, marginTop: spacing.sm },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: spacing.md,
    textAlign: "center",
  },
  errorDesc: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["3xl"] },
  heroCard: {
    backgroundColor: colors.bgSecondary ?? "#fff",
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: (colors.teal as string) + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroDoctor: { fontSize: 15, color: colors.teal, fontWeight: "600" },
  heroSchedule: { fontSize: 13, color: colors.foregroundSecondary },
  heroHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  heroIntro: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.teal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  secondaryBtnText: { color: colors.foreground, fontSize: 15, fontWeight: "500" },
  hint: { fontSize: 12, color: colors.foregroundSecondary, textAlign: "center" },
  noteCard: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: (colors.teal as string) + "10",
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  tipsList: { gap: spacing.sm },
  tipRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 14, color: colors.foreground, lineHeight: 20 },
  endedBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
});
