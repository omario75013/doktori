import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, spacing, radii, clearStoredToken, getStoredToken, api, t, useLocale } from "@doktori/mobile-core";
import { clearPermissionsCache } from "../../hooks/useStaffPermissions";

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type StaffInfo = { id: string; name: string; role: string };

type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  createdAt: string;
};

type LeaveBalance = {
  accrued: number;
  used: number;
  balance: number;
  allowance: number | null;
};


export default function MoreScreen() {
  const { locale } = useLocale();

  const STATUS_META = {
    pending:  { label: t("secretary.settings.statusPending"),  color: "#B45309", bg: "#FFFBEB", border: "#F59E0B" },
    approved: { label: t("secretary.settings.statusApproved"), color: "#065F46", bg: "#ECFDF5", border: "#10B981" },
    denied:   { label: t("secretary.settings.statusDenied"),   color: "#B91C1C", bg: "#FEF2F2", border: "#EF4444" },
  };

  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Leave form state
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStoredToken().then((token) => {
      if (token) {
        const payload = decodeJwt(token);
        if (payload && typeof payload.id === "string") {
          setStaff({
            id: payload.id,
            name: (payload.name as string | undefined) ?? "Secrétaire",
            role: (payload.role as string | undefined) ?? "secretary",
          });
        }
      }
      setLoading(false);
    });
  }, []);

  const loadLeave = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const data = await api<{ requests: LeaveRequest[]; balance: LeaveBalance | null }>(
        "/api/staff/leave",
        { noRedirect: true }
      );
      setLeaveRequests(data.requests);
      setLeaveBalance(data.balance);
    } catch {
      // non-fatal
    } finally {
      setLeaveLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadLeave(); }, [loadLeave]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadLeave(); }, [loadLeave]);

  async function logout() {
    Alert.alert(t("secretary.settings.logoutTitle"), t("secretary.settings.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("secretary.settings.logout"),
        style: "destructive",
        onPress: async () => {
          clearPermissionsCache();
          await clearStoredToken();
          router.replace("/(auth)/patient-login");
        },
      },
    ]);
  }

  async function submitLeave() {
    if (!leaveStart.match(/^\d{4}-\d{2}-\d{2}$/) || !leaveEnd.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert(t("secretary.settings.invalidDateFormat"), t("secretary.settings.invalidDateFormatDesc"));
      return;
    }
    if (leaveEnd < leaveStart) {
      Alert.alert(t("secretary.settings.endBeforeStart"), t("secretary.settings.endBeforeStartDesc"));
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/staff/leave", {
        method: "POST",
        body: { startDate: leaveStart, endDate: leaveEnd, reason: leaveReason.trim() || null },
        noRedirect: true,
      });
      setShowLeaveModal(false);
      setLeaveStart(""); setLeaveEnd(""); setLeaveReason("");
      await loadLeave();
      Alert.alert(t("secretary.settings.leaveRequestSent"), t("secretary.settings.leaveRequestSentDesc"));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("secretary.settings.sendError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  const initials = (staff?.name ?? "S")
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const pendingCount = leaveRequests.filter((r) => r.status === "pending").length;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      >
        <Text style={styles.pageTitle}>{t("secretary.settings.title")}</Text>

        {/* Identity card */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.staffName}>{staff?.name ?? t("auth.secretary")}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="clipboard-outline" size={12} color={colors.teal} />
              <Text style={styles.roleText}>{t("secretary.settings.spaceLabel")}</Text>
            </View>
          </View>
          <Ionicons name="person-circle-outline" size={28} color={colors.border} />
        </View>

        {/* Mon compte */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("secretary.settings.sectionAccount")}</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="person-outline"
              label={t("secretary.settings.personalInfo")}
              sublabel={t("secretary.settings.personalInfoDesc")}
              onPress={() => router.push("/(secretary)/informations-personnelles")}
            />
            <MenuRow
              icon="notifications-outline"
              label={t("secretary.settings.notifications")}
              sublabel={t("secretary.settings.notificationsDesc")}
              onPress={() => router.push("/(secretary)/notifications")}
            />
            <MenuRow
              icon="settings-outline"
              label={t("secretary.settings.parametres")}
              sublabel={t("secretary.settings.parametresDesc")}
              onPress={() => router.push("/(secretary)/parametres")}
              last
            />
          </View>
        </View>

        {/* Congés */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("secretary.settings.sectionLeave")}</Text>

          {/* Balance card */}
          {leaveLoading && !leaveBalance ? (
            <ActivityIndicator color={colors.teal} style={{ marginVertical: spacing.sm }} />
          ) : leaveBalance ? (
            <View style={styles.balanceCard}>
              <BalanceStat label={t("secretary.settings.leaveAcquired")} value={leaveBalance.accrued} unit="j" color={colors.teal} />
              <View style={styles.balanceDivider} />
              <BalanceStat label={t("secretary.settings.leaveUsed")} value={leaveBalance.used} unit="j" color="#B45309" />
              <View style={styles.balanceDivider} />
              <BalanceStat
                label={t("secretary.settings.leaveBalance")}
                value={leaveBalance.balance}
                unit="j"
                color={leaveBalance.balance >= 0 ? "#059669" : "#DC2626"}
              />
            </View>
          ) : null}

          <View style={styles.menuCard}>
            <MenuRow
              icon="calendar-outline"
              label={t("secretary.settings.requestLeave")}
              sublabel={t("secretary.settings.requestLeaveDesc")}
              onPress={() => setShowLeaveModal(true)}
            />
            <MenuRow
              icon="list-outline"
              label={t("secretary.settings.myRequests")}
              sublabel={pendingCount > 0 ? t("secretary.settings.pendingLeave", { count: pendingCount }) : t("secretary.settings.myRequestsDesc")}
              badge={pendingCount > 0 ? String(pendingCount) : undefined}
              onPress={() => setShowHistory(true)}
              last
            />
          </View>
        </View>

        {/* Compte */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("secretary.settings.sectionLogout")}</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="log-out-outline"
              label={t("secretary.settings.logout")}
              onPress={logout}
              danger
              last
            />
          </View>
        </View>

        <Text style={styles.version}>{t("secretary.settings.footer")}</Text>
      </ScrollView>

      {/* Leave request modal */}
      <Modal visible={showLeaveModal} transparent animationType="slide" onRequestClose={() => setShowLeaveModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowLeaveModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t("secretary.settings.requestLeave")}</Text>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <FormField
              label={t("secretary.settings.leaveStartLabel")}
              value={leaveStart}
              onChange={setLeaveStart}
              placeholder={t("secretary.settings.leaveStartPlaceholder")}
              keyboardType="numeric"
              maxLength={10}
            />
            <FormField
              label={t("secretary.settings.leaveEndLabel")}
              value={leaveEnd}
              onChange={setLeaveEnd}
              placeholder={t("secretary.settings.leaveEndPlaceholder")}
              keyboardType="numeric"
              maxLength={10}
            />
            <FormField
              label={t("secretary.settings.leaveReasonLabel")}
              value={leaveReason}
              onChange={setLeaveReason}
              placeholder={t("secretary.settings.leaveReasonPlaceholder")}
              multiline
            />
            {leaveStart && leaveEnd && leaveEnd >= leaveStart && (
              <View style={styles.durationHint}>
                <Ionicons name="information-circle-outline" size={16} color={colors.teal} />
                <Text style={styles.durationHintText}>
                  {(() => {
                    const diff = (new Date(leaveEnd).getTime() - new Date(leaveStart).getTime()) / 86400000 + 1;
                    return t(diff > 1 ? "secretary.settings.leaveDurationPlural" : "secretary.settings.leaveDuration", { count: diff });
                  })()}
                </Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.submitBtn, (submitting || pressed) && { opacity: 0.75 }]}
              onPress={submitLeave}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitBtnText}>{t("secretary.settings.submitLeave")}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* History modal */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowHistory(false)} />
        <View style={[styles.sheet, { maxHeight: "80%" }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t("secretary.settings.historyTitle")}</Text>
          {leaveRequests.length === 0 ? (
            <View style={styles.emptyLeave}>
              <Ionicons name="calendar-clear-outline" size={40} color={colors.border} />
              <Text style={styles.emptyLeaveText}>{t("secretary.settings.noRequests")}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
              {leaveRequests.map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                const start = new Date(r.startDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                const end = new Date(r.endDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                const days = (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000 + 1;
                return (
                  <View key={r.id} style={[styles.leaveCard, { borderLeftColor: meta.border }]}>
                    <View style={styles.leaveCardTop}>
                      <Text style={styles.leaveDates}>{start} → {end}</Text>
                      <View style={[styles.leaveBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                        <Text style={[styles.leaveBadgeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.leaveDays}>{t(days > 1 ? "secretary.settings.leaveDurationPlural" : "secretary.settings.leaveDuration", { count: days })}</Text>
                    {r.reason && <Text style={styles.leaveReason}>{r.reason}</Text>}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function BalanceStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.balanceStat}>
      <Text style={[styles.balanceValue, { color }]}>{value}<Text style={styles.balanceUnit}>{unit}</Text></Text>
      <Text style={styles.balanceLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon, label, sublabel, onPress, danger, last, badge,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  badge?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, !last && styles.menuRowBorder, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: danger ? "#FEF2F2" : colors.bgSecondary }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </Pressable>
  );
}

function FormField({
  label, value, onChange, placeholder, keyboardType, maxLength, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  maxLength?: number; multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.foregroundSecondary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: 15, color: colors.foreground,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing["3xl"] },
  pageTitle: { fontSize: 22, fontWeight: "800", color: colors.foreground },

  // Identity card
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  avatar: {
    width: 52, height: 52, borderRadius: radii.full,
    backgroundColor: colors.tealDark, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  staffName: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  roleText: { fontSize: 12, color: colors.teal, fontWeight: "600" },

  // Section
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 4,
  },

  // Balance card
  balanceCard: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  balanceStat: { flex: 1, alignItems: "center", gap: 2 },
  balanceValue: { fontSize: 22, fontWeight: "800" },
  balanceUnit: { fontSize: 13, fontWeight: "600" },
  balanceLabel: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  balanceDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  // Menu card
  menuCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md, backgroundColor: colors.bg },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: { width: 34, height: 34, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  menuSublabel: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  menuBadge: {
    backgroundColor: colors.teal, borderRadius: radii.full,
    minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  menuBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  version: { textAlign: "center", fontSize: 12, color: colors.border, marginTop: spacing.sm },

  // Sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii["3xl"],
    borderTopRightRadius: radii["3xl"],
    padding: spacing.xl,
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: radii.full, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },

  // Leave form
  durationHint: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#F0FDFA", borderRadius: radii.md, padding: spacing.md },
  durationHintText: { fontSize: 13, color: colors.teal, fontWeight: "600" },
  submitBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.xs },
  submitBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },

  // Leave history
  emptyLeave: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyLeaveText: { fontSize: 14, color: colors.foregroundSecondary },
  leaveCard: {
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, padding: spacing.md, gap: 4, backgroundColor: colors.bg,
  },
  leaveCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leaveDates: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  leaveDays: { fontSize: 12, color: colors.foregroundSecondary },
  leaveReason: { fontSize: 12, color: colors.foregroundSecondary, fontStyle: "italic" },
  leaveBadge: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  leaveBadgeText: { fontSize: 11, fontWeight: "700" },
});
