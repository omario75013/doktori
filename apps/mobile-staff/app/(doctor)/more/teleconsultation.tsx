import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Loader, Empty, formatDate, Banner } from "./_ui";

type ConsultationMode = "cabinet" | "teleconsult" | "both";

type TeleSettings = {
  consultationMode: ConsultationMode | null;
  teleconsultFee: number | null;
  consultationFee: number | null;
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
};

const MODE_ORDER: ConsultationMode[] = ["cabinet", "teleconsult", "both"];

const MODE_ICONS: Record<ConsultationMode, keyof typeof Ionicons.glyphMap> = {
  cabinet: "business-outline",
  teleconsult: "videocam-outline",
  both: "git-merge-outline",
};

const MODE_COLORS: Record<ConsultationMode, { border: string; bg: string }> = {
  cabinet: { border: colors.teal, bg: "#ECFDF5" },
  teleconsult: { border: "#8B5CF6", bg: "#F5F3FF" },
  both: { border: "#6366F1", bg: "#EEF2FF" },
};

export default function Teleconsultation() {
  const { locale } = useLocale();
  const [settings, setSettings] = useState<TeleSettings | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[] | null>(null);

  // Editable state
  const [mode, setMode] = useState<ConsultationMode>("cabinet");
  const [useSameFee, setUseSameFee] = useState(true);
  const [teleconsultFee, setTeleconsultFee] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([
          api<TeleSettings>("/api/doctor/teleconsult-settings").catch(() => null),
          api<Appointment[]>("/api/appointments/doctor").catch(() => []),
        ]);
        setSettings(s);
        const initialMode = (s?.consultationMode ?? "cabinet") as ConsultationMode;
        setMode(initialMode);
        setUseSameFee(s?.teleconsultFee == null);
        setTeleconsultFee(
          s?.teleconsultFee != null
            ? String(s.teleconsultFee / 1000)
            : s?.consultationFee != null
              ? String(s.consultationFee / 1000)
              : ""
        );
        const now = new Date();
        setUpcoming(
          (a ?? [])
            .filter(
              (x) =>
                (x.type === "teleconsult" || x.type === "video") &&
                new Date(x.startsAt) >= now &&
                x.status !== "cancelled"
            )
            .sort((x, y) => x.startsAt.localeCompare(y.startsAt))
        );
      } catch {
        setSettings(null);
        setUpcoming([]);
      }
    })();
  }, []);

  const sameFeeLabel = useMemo(() => {
    if (settings?.consultationFee != null) {
      return t("doctor.teleconsult.sameFeeWithValue", {
        fee: String((settings.consultationFee / 1000).toFixed(0)),
      });
    }
    return t("doctor.teleconsult.sameFee");
  }, [settings]);

  async function save() {
    if (saving) return;
    let feeInMillimes: number | null = null;
    if (!useSameFee && mode !== "cabinet") {
      const parsed = parseFloat(teleconsultFee.replace(",", "."));
      if (isNaN(parsed) || parsed < 0) {
        Alert.alert(t("doctor.teleconsult.feeInvalid"));
        return;
      }
      feeInMillimes = Math.round(parsed * 1000);
    }
    setSaving(true);
    try {
      await api("/api/doctor/teleconsult-settings", {
        method: "PUT",
        body: { consultationMode: mode, teleconsultFee: feeInMillimes },
        noRedirect: true,
      });
      setSettings((prev) =>
        prev
          ? { ...prev, consultationMode: mode, teleconsultFee: feeInMillimes }
          : { consultationMode: mode, teleconsultFee: feeInMillimes, consultationFee: null }
      );
      Alert.alert(t("doctor.teleconsult.saveSuccess"));
    } catch (e) {
      Alert.alert(
        t("doctor.teleconsult.saveError"),
        e instanceof Error ? e.message : undefined
      );
    } finally {
      setSaving(false);
    }
  }

  if (!upcoming || !settings) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.teleconsult.title") }} />
        <Loader />
      </>
    );
  }

  const showTeleSections = mode === "teleconsult" || mode === "both";

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.teleconsult.title") }} />
      <Screen>
        <Text style={styles.subtitle}>{t("doctor.teleconsult.subtitle")}</Text>

        <Card title={t("doctor.teleconsult.modeLabel")}>
          <View style={styles.modeGrid}>
            {MODE_ORDER.map((m) => {
              const selected = mode === m;
              const palette = MODE_COLORS[m];
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.modeCard,
                    selected && {
                      borderColor: palette.border,
                      backgroundColor: palette.bg,
                    },
                  ]}
                >
                  <Ionicons
                    name={MODE_ICONS[m]}
                    size={24}
                    color={selected ? palette.border : colors.foregroundSecondary}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      selected && { color: colors.foreground },
                    ]}
                    numberOfLines={2}
                  >
                    {m === "cabinet"
                      ? t("doctor.teleconsult.cabinetOnly")
                      : m === "teleconsult"
                        ? t("doctor.teleconsult.teleconsultOnly")
                        : t("doctor.teleconsult.both")}
                  </Text>
                  <Text style={styles.modeDesc} numberOfLines={3}>
                    {m === "cabinet"
                      ? t("doctor.teleconsult.cabinetOnlyDesc")
                      : m === "teleconsult"
                        ? t("doctor.teleconsult.teleconsultOnlyDesc")
                        : t("doctor.teleconsult.bothDesc")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {showTeleSections && (
          <Banner>{t("doctor.teleconsult.scheduleNote")}</Banner>
        )}

        {showTeleSections && (
          <Card title={t("doctor.teleconsult.fee")}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setUseSameFee((v) => !v)}
            >
              <View style={[styles.checkbox, useSameFee && styles.checkboxOn]}>
                {useSameFee && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>{sameFeeLabel}</Text>
            </Pressable>

            {!useSameFee && (
              <View style={styles.feeRow}>
                <TextInput
                  value={teleconsultFee}
                  onChangeText={setTeleconsultFee}
                  keyboardType="decimal-pad"
                  placeholder={t("doctor.teleconsult.feePlaceholder")}
                  placeholderTextColor={colors.foregroundSecondary}
                  style={styles.input}
                />
                <Text style={styles.unit}>DT</Text>
              </View>
            )}

            <View style={styles.commissionBox}>
              <Text style={styles.commissionText}>
                {t("doctor.teleconsult.commission")}
              </Text>
            </View>
          </Card>
        )}

        <Pressable
          onPress={save}
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t("doctor.teleconsult.save")}</Text>
          )}
        </Pressable>

        <Card title={t("doctor.teleconsult.upcomingSessions", { count: upcoming.length })}>
          {upcoming.length === 0 ? (
            <Empty icon="videocam-outline" title={t("doctor.teleconsult.noSessions")} />
          ) : (
            upcoming.slice(0, 20).map((a) => (
              <View key={a.id} style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name="videocam" size={16} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{a.patientName}</Text>
                  <Text style={styles.sub}>
                    {formatDate(a.startsAt)} ·{" "}
                    {new Date(a.startsAt).toLocaleTimeString(locale === "ar" ? "ar-TN" : "fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {a.reason && <Text style={styles.reason}>{a.reason}</Text>}
                </View>
              </View>
            ))
          )}
        </Card>

        <Banner>{t("doctor.teleconsult.webOnlyHint")}</Banner>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  modeGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: "center",
    gap: 6,
    minHeight: 130,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textAlign: "center",
  },
  modeDesc: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textAlign: "center",
    lineHeight: 13,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    flex: 1,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bgSecondary,
  },
  unit: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    fontWeight: "600",
  },
  commissionBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  commissionText: {
    fontSize: 11,
    color: "#6D28D9",
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  icon: {
    height: 34,
    width: 34,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  reason: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
});
