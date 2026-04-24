import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { Screen, Card, Loader } from "./_ui";

type Referral = {
  code: string | null;
  totalReferred: number;
  validated: number;
  rewardEarnedMillimes: number;
};

export default function Parrainage() {
  const [data, setData] = useState<Referral | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Referral>("/api/doctor/referral-code");
        setData(r);
      } catch {
        setData({
          code: null,
          totalReferred: 0,
          validated: 0,
          rewardEarnedMillimes: 0,
        });
      }
    })();
  }, []);

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: "Parrainage" }} />
        <Loader />
      </>
    );
  }


  return (
    <>
      <Stack.Screen options={{ title: "Parrainage" }} />
      <Screen>
        <View style={styles.hero}>
          <Ionicons name="gift" size={28} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Votre code de parrainage</Text>
          {data.code ? (
            <Pressable
              onPress={() =>
                data?.code && Alert.alert("Votre code", data.code, [{ text: "OK" }])
              }
              style={styles.codeBox}
            >
              <Text style={styles.code}>{data.code}</Text>
              <Ionicons name="copy" size={16} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Text style={styles.heroEmpty}>
              Aucun code généré. Contactez l&apos;admin.
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Stat label="Parrainés" value={String(data.totalReferred)} />
          <Stat label="Validés" value={String(data.validated)} />
          <Stat
            label="Gains"
            value={`${((data.rewardEarnedMillimes ?? 0) / 1000).toFixed(0)} DT`}
          />
        </View>

        <Card title="Comment ça marche ?">
          <Row
            icon="share"
            text="Partagez votre code avec un confrère qui s'inscrit sur Doktori."
          />
          <Row
            icon="checkmark-circle"
            text="Dès sa validation par l'équipe Doktori, vous gagnez un crédit."
          />
          <Row
            icon="wallet"
            text="Le crédit est ajouté à votre wallet et utilisable immédiatement."
          />
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
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.teal} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  heroTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  heroEmpty: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  code: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.teal },
  statLabel: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  rowText: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 },
});
