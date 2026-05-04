import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Kv, Loader, Empty, formatDate, Banner } from "./_ui";

type TeleSettings = {
  consultationMode: string;
  teleconsultFee: number | null;
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
};

export default function Teleconsultation() {
  const { locale } = useLocale();
  const [settings, setSettings] = useState<TeleSettings | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([
          api<TeleSettings>("/api/doctor/teleconsult-settings").catch(() => null),
          api<Appointment[]>("/api/appointments/doctor"),
        ]);
        setSettings(s);
        const now = new Date();
        setUpcoming(
          a
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

  if (!upcoming) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.teleconsult.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Téléconsultation" }} />
      <Screen>
        <Card title={t("doctor.teleconsult.configSection")}>
          <Kv
            label={t("doctor.teleconsult.mode")}
            value={
              settings?.consultationMode === "both"
                ? t("doctor.teleconsult.modeBoth")
                : settings?.consultationMode === "teleconsult"
                ? t("doctor.teleconsult.modeTeleOnly")
                : t("doctor.teleconsult.modeCabinetOnly")
            }
          />
          <Kv
            label={t("doctor.teleconsult.feeTeleconsult")}
            value={
              settings?.teleconsultFee
                ? `${(settings.teleconsultFee / 1000).toFixed(3).replace(".", ",")} DT`
                : t("doctor.teleconsult.feeNotSet")
            }
          />
        </Card>

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
                    {new Date(a.startsAt).toLocaleTimeString("fr-FR", {
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

        <Banner>
          {t("doctor.teleconsult.webOnlyHint")}
        </Banner>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
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
