import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  radii,
  api,
  t,
  getApiBaseUrl,
  getStoredToken,
} from "@doktori/mobile-core";
import { Screen, Loader, Empty, Card, Banner, formatDate } from "./_ui";

type Invoice = {
  id: string;
  plan: string;
  status: string;
  priceMillimes: number;
  billingCycle: string;
  paymentProvider: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  invoiceNumber: string;
};

function formatAmount(millimes: number): string {
  return (millimes / 1000).toFixed(3).replace(".", ",") + " DT";
}

function planLabelKey(plan: string): string {
  switch (plan) {
    case "free":
      return "doctor.factures.planFree";
    case "essentiel":
      return "doctor.factures.planEssential";
    case "pro":
      return "doctor.factures.planPro";
    case "clinique":
      return "doctor.factures.planClinic";
    default:
      return "";
  }
}

function statusMeta(status: string) {
  switch (status) {
    case "active":
      return {
        labelKey: "doctor.factures.statusActive",
        bg: "#DCFCE7",
        fg: "#166534",
      };
    case "expired":
      return {
        labelKey: "doctor.factures.statusExpired",
        bg: "#E5E7EB",
        fg: "#4B5563",
      };
    case "cancelled":
      return {
        labelKey: "doctor.factures.statusCancelled",
        bg: "#FEE2E2",
        fg: "#991B1B",
      };
    case "paid":
      return {
        labelKey: "doctor.factures.paid",
        bg: "#DCFCE7",
        fg: "#166534",
      };
    case "pending":
      return {
        labelKey: "doctor.factures.pending",
        bg: "#FED7AA",
        fg: "#9A3412",
      };
    default:
      return { labelKey: "", bg: "#E5E7EB", fg: "#4B5563" };
  }
}

export default function Factures() {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const r = await api<Invoice[]>("/api/doctor/invoices");
      setRows(r);
    } catch {
      setError(t("doctor.factures.loadError"));
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDownload(inv: Invoice) {
    setDownloading(inv.id);
    try {
      const base = getApiBaseUrl();
      const token = await getStoredToken();
      // Try to fetch HTML — if it succeeds, open it in the browser via data URL
      // is not reliable on mobile; instead append token via header is impossible
      // for Linking. So we use a short-lived approach: open the doctor portal
      // download URL with token query (server already accepts Bearer via header).
      // Simpler: open the URL through Linking; the user will be redirected to
      // web login if not authenticated. Most users already are on the web.
      const url = `${base}/api/doctor/invoices/${inv.id}/download${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }`;
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t("doctor.factures.downloadError"),
        t("doctor.factures.downloadError")
      );
    } finally {
      setDownloading(null);
    }
  }

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
      <Stack.Screen options={{ title: t("doctor.factures.title") }} />
      <Screen>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="receipt" size={20} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {t("doctor.factures.pageTitle")}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t("doctor.factures.pageSubtitle")}
            </Text>
          </View>
        </View>

        {error && (
          <Banner tone="warn">
            <Text>{error}</Text>
          </Banner>
        )}

        {rows.length === 0 ? (
          <Empty
            icon="receipt-outline"
            title={t("doctor.factures.noInvoices")}
            sub={t("doctor.factures.noInvoicesDesc")}
          />
        ) : (
          <>
            {rows.map((inv) => {
              const sm = statusMeta(inv.status);
              const planKey = planLabelKey(inv.plan);
              const cycle =
                inv.billingCycle === "annual"
                  ? t("doctor.factures.annual")
                  : t("doctor.factures.monthly");
              return (
                <Card key={inv.id}>
                  {/* Top row: invoice number + status badge */}
                  <View style={styles.topRow}>
                    <Text style={styles.invoiceNumber}>{inv.invoiceNumber}</Text>
                    <View style={[styles.badge, { backgroundColor: sm.bg }]}>
                      <Text style={[styles.badgeText, { color: sm.fg }]}>
                        {sm.labelKey ? t(sm.labelKey) : inv.status}
                      </Text>
                    </View>
                  </View>

                  {/* Plan + cycle */}
                  <View style={styles.kvRow}>
                    <Text style={styles.kvLabel}>
                      {t("doctor.factures.plan")}
                    </Text>
                    <Text style={styles.kvValue}>
                      {planKey ? t(planKey) : inv.plan}
                      <Text style={styles.kvMuted}> ({cycle})</Text>
                    </Text>
                  </View>

                  {/* Period */}
                  <View style={styles.kvRow}>
                    <Text style={styles.kvLabel}>
                      {t("doctor.factures.period")}
                    </Text>
                    <Text style={styles.kvValue}>
                      {inv.startsAt
                        ? `${formatDate(inv.startsAt)}${
                            inv.endsAt ? " → " + formatDate(inv.endsAt) : ""
                          }`
                        : formatDate(inv.createdAt)}
                    </Text>
                  </View>

                  {/* Amount */}
                  <View style={styles.kvRow}>
                    <Text style={styles.kvLabel}>
                      {t("doctor.factures.amountTtc")}
                    </Text>
                    <Text style={styles.amount}>
                      {formatAmount(inv.priceMillimes)}
                    </Text>
                  </View>

                  {/* Download button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.downloadBtn,
                      pressed && { opacity: 0.8 },
                      downloading === inv.id && { opacity: 0.6 },
                    ]}
                    disabled={downloading === inv.id}
                    onPress={() => handleDownload(inv)}
                  >
                    {downloading === inv.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="download-outline" size={16} color="#fff" />
                    )}
                    <Text style={styles.downloadText}>
                      {downloading === inv.id
                        ? t("doctor.factures.downloading")
                        : t("doctor.factures.download")}
                    </Text>
                  </Pressable>
                </Card>
              );
            })}

            {/* Legal footer */}
            <Text style={styles.legal}>
              {t("doctor.factures.legalFooter")}
            </Text>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerIcon: {
    height: 40,
    width: 40,
    borderRadius: radii.lg,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  invoiceNumber: {
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.foreground,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  kvLabel: { fontSize: 12, color: colors.foregroundSecondary },
  kvValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "right",
    flex: 1,
  },
  kvMuted: { color: colors.foregroundSecondary, fontWeight: "400" },
  amount: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "right",
  },
  downloadBtn: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  downloadText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  legal: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 14,
  },
});
