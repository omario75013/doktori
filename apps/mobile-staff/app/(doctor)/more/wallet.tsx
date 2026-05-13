import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Loader, formatMillimes, formatDate, Empty } from "./_ui";

type TxType = "credit" | "commission" | "withdrawal" | "refund";

type WalletApiResponse = {
  wallet: {
    balance: number;
    totalEarned: number;
    totalCommission: number;
    totalWithdrawn: number;
  } | null;
  transactions: Array<{
    id: string;
    type: TxType;
    amount: number;
    description: string | null;
    createdAt: string;
  }>;
};

type FilterType = TxType | "all";

const FILTERS: FilterType[] = ["all", "credit", "commission", "withdrawal", "refund"];

const TYPE_META: Record<
  TxType,
  { icon: React.ComponentProps<typeof Ionicons>["name"]; sign: string; bg: string; fg: string }
> = {
  credit: { icon: "arrow-down-circle", sign: "+", bg: "#DCFCE7", fg: "#15803D" },
  commission: { icon: "pricetag", sign: "-", bg: "#FEF3C7", fg: "#B45309" },
  withdrawal: { icon: "arrow-up-circle", sign: "-", bg: "#DBEAFE", fg: "#1D4ED8" },
  refund: { icon: "refresh", sign: "-", bg: "#FEE2E2", fg: "#B91C1C" },
};

function formatDT(millimes: number): string {
  return (millimes / 1000).toFixed(3) + " DT";
}

function formatDTShort(millimes: number): string {
  const val = millimes / 1000;
  if (val >= 1000) return (val / 1000).toFixed(1) + "k DT";
  return val.toFixed(val < 10 ? 3 : 0) + " DT";
}

export default function Wallet() {
  useLocale();
  const [data, setData] = useState<WalletApiResponse | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Withdrawal modal
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<WalletApiResponse>("/api/doctor/wallet");
      setData({
        wallet: r.wallet ?? { balance: 0, totalEarned: 0, totalCommission: 0, totalWithdrawn: 0 },
        transactions: r.transactions ?? [],
      });
    } catch {
      setData({
        wallet: { balance: 0, totalEarned: 0, totalCommission: 0, totalWithdrawn: 0 },
        transactions: [],
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const balanceMillimes = data?.wallet?.balance ?? 0;
  const totalEarned = data?.wallet?.totalEarned ?? 0;
  const totalCommission = data?.wallet?.totalCommission ?? 0;
  const totalWithdrawn = data?.wallet?.totalWithdrawn ?? 0;
  const transactions = data?.transactions ?? [];

  const filteredTransactions =
    filter === "all" ? transactions : transactions.filter((tx) => tx.type === filter);

  const openModal = () => {
    if (balanceMillimes <= 0) return;
    setSuccessBanner(false);
    setAmount("");
    setModalOpen(true);
  };

  const setQuickAmount = (pct: number) => {
    const val = ((balanceMillimes / 1000) * pct) / 100;
    if (val > 0) setAmount(val.toFixed(3));
  };

  const handleWithdraw = async () => {
    const parsed = parseFloat(amount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert(t("doctor.wallet.title"), t("doctor.wallet.withdrawInvalid"));
      return;
    }
    const amountInMillimes = Math.round(parsed * 1000);
    if (amountInMillimes > balanceMillimes) {
      Alert.alert(t("doctor.wallet.title"), t("doctor.wallet.withdrawExceedsBalance"));
      return;
    }
    setWithdrawing(true);
    try {
      await api("/api/doctor/wallet", {
        method: "POST",
        body: JSON.stringify({ amount: amountInMillimes }),
      });
      setModalOpen(false);
      setAmount("");
      setSuccessBanner(true);
      setRefreshing(true);
      await load();
      setRefreshing(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("doctor.wallet.withdrawError");
      Alert.alert(t("doctor.wallet.title"), msg);
    } finally {
      setWithdrawing(false);
    }
  };

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
        {/* Success banner */}
        {successBanner && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#15803D" />
            <Text style={styles.successText}>{t("doctor.wallet.withdrawSuccess")}</Text>
          </View>
        )}

        {/* Hero: balance card */}
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Ionicons name="wallet" size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroLabel}>{t("doctor.wallet.balance")}</Text>
          </View>
          <Text style={styles.heroValue}>{formatDT(balanceMillimes)}</Text>
          <Text style={styles.heroSubtitle}>{t("doctor.wallet.balanceSubtitle")}</Text>

          <TouchableOpacity
            onPress={openModal}
            disabled={balanceMillimes <= 0}
            style={[styles.withdrawBtn, balanceMillimes <= 0 && { opacity: 0.5 }]}
          >
            <Ionicons name="cash-outline" size={16} color={colors.foreground} />
            <Text style={styles.withdrawBtnText}>{t("doctor.wallet.withdraw")}</Text>
          </TouchableOpacity>
        </View>

        {/* Stat cards (3) */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: "#BBF7D0" }]}>
            <View style={styles.statHead}>
              <View style={[styles.statIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="trending-up" size={14} color="#15803D" />
              </View>
              <Text style={styles.statLabel}>{t("doctor.wallet.earned")}</Text>
            </View>
            <Text style={[styles.statValue, { color: "#15803D" }]}>
              {formatDTShort(totalEarned)}
            </Text>
            <Text style={styles.statSub}>{t("doctor.wallet.earnedSubtitle")}</Text>
          </View>

          <View style={[styles.statCard, { borderColor: "#FDE68A" }]}>
            <View style={styles.statHead}>
              <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="pricetag" size={14} color="#B45309" />
              </View>
              <Text style={styles.statLabel}>{t("doctor.wallet.commission")}</Text>
            </View>
            <Text style={[styles.statValue, { color: "#B45309" }]}>
              {formatDTShort(totalCommission)}
            </Text>
            <Text style={styles.statSub}>{t("doctor.wallet.commissionSubtitle")}</Text>
          </View>

          <View style={[styles.statCard, { borderColor: "#BFDBFE" }]}>
            <View style={styles.statHead}>
              <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="card" size={14} color="#1D4ED8" />
              </View>
              <Text style={styles.statLabel}>{t("doctor.wallet.withdrawn")}</Text>
            </View>
            <Text style={[styles.statValue, { color: "#1D4ED8" }]}>
              {formatDTShort(totalWithdrawn)}
            </Text>
            <Text style={styles.statSub}>{t("doctor.wallet.withdrawnSubtitle")}</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle"
            size={20}
            color={colors.teal}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.infoTitle}>{t("doctor.wallet.howItWorksTitle")}</Text>
            <View style={{ gap: 4 }}>
              {(["explanation1", "explanation2", "explanation3"] as const).map((key) => (
                <View key={key} style={styles.infoRow}>
                  <Ionicons name="arrow-forward" size={11} color={colors.teal} />
                  <Text style={styles.infoText}>{t(`doctor.wallet.${key}`)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Transactions section with filter pills */}
        <Card title={t("doctor.wallet.transactions")}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => {
              const labelKey =
                f === "all"
                  ? "filterAll"
                  : f === "credit"
                  ? "typeCredit"
                  : f === "commission"
                  ? "typeCommission"
                  : f === "withdrawal"
                  ? "typeWithdrawal"
                  : "typeRefund";
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {t(`doctor.wallet.${labelKey}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {refreshing && (
            <View style={{ paddingVertical: spacing.sm, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.teal} />
            </View>
          )}

          {filteredTransactions.length === 0 ? (
            <Empty
              icon="wallet-outline"
              title={t("doctor.wallet.noTransactions")}
            />
          ) : (
            filteredTransactions.map((tx) => {
              const meta = TYPE_META[tx.type];
              const typeLabelKey =
                tx.type === "credit"
                  ? "typeCredit"
                  : tx.type === "commission"
                  ? "typeCommission"
                  : tx.type === "withdrawal"
                  ? "typeWithdrawal"
                  : "typeRefund";
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>{t(`doctor.wallet.${typeLabelKey}`)}</Text>
                    {tx.description ? (
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description}
                      </Text>
                    ) : null}
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: meta.fg }]}>
                    {meta.sign}
                    {formatMillimes(Math.abs(tx.amount))}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </Screen>

      {/* Withdrawal modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.modalHeadIcon}>
                  <Ionicons name="cash-outline" size={18} color={colors.teal} />
                </View>
                <Text style={styles.modalTitle}>{t("doctor.wallet.withdrawTitle")}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={styles.modalClose}
                accessibilityLabel={t("doctor.wallet.close")}
              >
                <Ionicons name="close" size={18} color={colors.foregroundSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBalanceCard}>
              <Text style={styles.modalBalanceLabel}>
                {t("doctor.wallet.availableBalance")}
              </Text>
              <Text style={styles.modalBalanceValue}>{formatDT(balanceMillimes)}</Text>
            </View>

            <View>
              <Text style={styles.fieldLabel}>{t("doctor.wallet.withdrawAmount")}</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder={`Max: ${(balanceMillimes / 1000).toFixed(3)} DT`}
                  placeholderTextColor={colors.foregroundSecondary}
                  style={styles.input}
                />
                <Text style={styles.inputSuffix}>DT</Text>
              </View>
              <View style={styles.quickRow}>
                {[25, 50, 100].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    onPress={() => setQuickAmount(pct)}
                    style={styles.quickPill}
                  >
                    <Text style={styles.quickPillText}>{pct}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.noteRow}>
              <Ionicons name="information-circle" size={16} color="#1D4ED8" />
              <Text style={styles.noteText}>{t("doctor.wallet.withdrawNote")}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                disabled={withdrawing}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>{t("doctor.wallet.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={withdrawing || !amount}
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  (withdrawing || !amount) && { opacity: 0.6 },
                ]}
              >
                {withdrawing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {t("doctor.wallet.withdrawConfirm")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  successText: { color: "#15803D", fontSize: 13, fontWeight: "600", flex: 1 },

  hero: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: 6,
  },
  heroHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
  withdrawBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  withdrawBtnText: { color: colors.foreground, fontWeight: "800", fontSize: 14 },

  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "#FFFFFF",
    gap: 4,
  },
  statHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 9,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  statValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  statSub: { fontSize: 10, color: colors.foregroundSecondary },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  infoTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  infoText: { fontSize: 12, color: colors.foregroundSecondary, flex: 1 },

  filterRow: { gap: 6, paddingBottom: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.lg,
    backgroundColor: "#F3F4F6",
  },
  pillActive: { backgroundColor: colors.foreground },
  pillText: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary },
  pillTextActive: { color: "#FFFFFF" },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  txDesc: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  txDate: { fontSize: 10, color: colors.foregroundSecondary, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "800" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalHeadIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalBalanceCard: {
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  modalBalanceLabel: { fontSize: 11, color: colors.foregroundSecondary },
  modalBalanceValue: { fontSize: 22, fontWeight: "800", color: colors.foreground, marginTop: 2 },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: "#FFFFFF",
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.foreground },
  inputSuffix: { fontSize: 13, color: colors.foregroundSecondary, fontWeight: "600" },
  quickRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  quickPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: "#F3F4F6",
  },
  quickPillText: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary },

  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: spacing.sm,
    borderRadius: radii.lg,
  },
  noteText: { color: "#1D4ED8", fontSize: 11, flex: 1 },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  btnGhost: { backgroundColor: "#F3F4F6" },
  btnGhostText: { color: colors.foreground, fontWeight: "700", fontSize: 13 },
  btnPrimary: { backgroundColor: colors.teal },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
});
