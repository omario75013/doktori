import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Loader, formatMillimes, formatDate, Empty } from "./_ui";

type WalletData = {
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  transactions: Array<{
    id: string;
    kind: string;
    amount: number;
    description: string | null;
    createdAt: string;
  }>;
};

export default function Wallet() {
  const { locale } = useLocale();
  const [data, setData] = useState<WalletData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<WalletData>("/api/doctor/wallet");
        setData(r);
      } catch {
        setData({ balance: 0, pendingBalance: 0, totalEarned: 0, transactions: [] });
      }
    })();
  }, []);

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.wallet.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.wallet.title") }} />
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t("doctor.wallet.available")}</Text>
          <Text style={styles.heroValue}>{formatMillimes(data.balance)}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={[styles.miniCard, { backgroundColor: "#FED7AA" }]}>
            <Text style={[styles.miniLabel, { color: "#9A3412" }]}>{t("doctor.wallet.pending")}</Text>
            <Text style={[styles.miniValue, { color: "#9A3412" }]}>
              {formatMillimes(data.pendingBalance)}
            </Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: "#DBEAFE" }]}>
            <Text style={[styles.miniLabel, { color: "#1E40AF" }]}>{t("doctor.wallet.totalEarned")}</Text>
            <Text style={[styles.miniValue, { color: "#1E40AF" }]}>
              {formatMillimes(data.totalEarned)}
            </Text>
          </View>
        </View>

        <Card title={t("doctor.wallet.recentTransactions")}>
          {data.transactions.length === 0 ? (
            <Empty title={t("doctor.wallet.noTransactions")} />
          ) : (
            data.transactions.slice(0, 15).map((t) => (
              <View key={t.id} style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>
                    {t.description ?? t.kind}
                  </Text>
                  <Text style={styles.txDate}>{formatDate(t.createdAt)}</Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: t.amount >= 0 ? "#16A34A" : "#DC2626" },
                  ]}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatMillimes(t.amount)}
                </Text>
              </View>
            ))
          )}
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  miniCard: { flex: 1, padding: spacing.md, borderRadius: radii.lg },
  miniLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    fontWeight: "700",
  },
  miniValue: { fontSize: 18, fontWeight: "800", marginTop: spacing.xs },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  txTitle: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  txDate: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: "800" },
});
