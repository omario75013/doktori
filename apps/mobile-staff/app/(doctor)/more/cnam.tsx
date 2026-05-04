import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Loader, Empty, formatDate } from "./_ui";

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  patientName: string;
  patientPhone: string;
};

/**
 * CNAM screen — simplified for mobile. Lists recent completed appointments
 * with CNAM-eligible patients. Feuille-de-soin generation remains on the
 * web portal (the PDF flow + e-signature is desktop-only for now).
 */
export default function Cnam() {
  const { locale } = useLocale();
  const [appts, setAppts] = useState<Appointment[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<Appointment[]>("/api/appointments/doctor");
      setAppts(r.filter((a) => a.status === "completed"));
    } catch {
      setAppts([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!appts) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.cnam.title") }} />
        <Loader />
      </>
    );
  }

  const lastMonth = appts.filter((a) => {
    const d = new Date(a.startsAt);
    return Date.now() - d.getTime() < 31 * 24 * 3600 * 1000;
  });

  return (
    <>
      <Stack.Screen options={{ title: "CNAM" }} />
      <Screen>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Stat label={t("doctor.cnam.consultations30d")} value={String(lastMonth.length)} />
          <Stat label={t("doctor.cnam.totalCompleted")} value={String(appts.length)} />
        </View>

        <Card title={t("doctor.cnam.guideTitle")}>
          <Row icon="document-text">
            {t("doctor.cnam.step1")}
          </Row>
          <Row icon="create">
            {t("doctor.cnam.step2")}
          </Row>
          <Row icon="cloud-upload">
            {t("doctor.cnam.step3")}
          </Row>
        </Card>

        <Card title={t("doctor.cnam.listTitle", { count: appts.length })}>
          {appts.length === 0 ? (
            <Empty icon="document-attach-outline" title={t("doctor.cnam.noConsultations")} />
          ) : (
            appts.slice(0, 20).map((a) => (
              <Pressable
                key={a.id}
                style={styles.row}
                onPress={() =>
                  Alert.alert(
                    a.patientName,
                    `${formatDate(a.startsAt)}\n${a.patientPhone}\n\n${t("doctor.cnam.webHint")}`
                  )
                }
              >
                <View style={styles.icon}>
                  <Ionicons name="document-attach" size={16} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{a.patientName}</Text>
                  <Text style={styles.sub}>{formatDate(a.startsAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.foregroundSecondary} />
              </Pressable>
            ))
          )}
        </Card>
      </Screen>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.guideRow}>
      <Ionicons name={icon} size={16} color={colors.teal} />
      <Text style={styles.guideText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.teal },
  statLabel: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: "center",
  },
  guideRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  guideText: { flex: 1, fontSize: 12, color: colors.foreground, lineHeight: 17 },
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
  name: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
});
