import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Loader, Empty, formatMillimes, formatDate } from "./_ui";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalMillimes: number;
  issuedAt: string;
  paidAt: string | null;
  patientName?: string;
};

export default function Factures() {
  const { locale } = useLocale();
  const [rows, setRows] = useState<Invoice[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Invoice[]>("/api/doctor/invoices");
        setRows(r);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  if (!rows) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.factures.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Factures" }} />
      <Screen>
        {rows.length === 0 ? (
          <Empty icon="receipt-outline" title={t("doctor.factures.noInvoices")} />
        ) : (
          rows.map((inv) => (
            <View key={inv.id} style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name="receipt" size={18} color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{inv.invoiceNumber}</Text>
                <Text style={styles.sub}>
                  {inv.patientName ?? "—"} · {formatDate(inv.issuedAt)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.amount}>{formatMillimes(inv.totalMillimes)}</Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        inv.status === "paid"
                          ? "#DCFCE7"
                          : inv.status === "cancelled"
                          ? "#E5E7EB"
                          : "#FED7AA",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          inv.status === "paid"
                            ? "#166534"
                            : inv.status === "cancelled"
                            ? "#4B5563"
                            : "#9A3412",
                      },
                    ]}
                  >
                    {inv.status === "paid"
                      ? t("doctor.factures.paid")
                      : inv.status === "cancelled"
                      ? t("doctor.factures.cancelled")
                      : t("doctor.factures.pending")}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  icon: {
    height: 40,
    width: 40,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  amount: { fontSize: 13, fontWeight: "800", color: colors.foreground },
  badge: {
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgeText: { fontSize: 9, fontWeight: "700" },
});
