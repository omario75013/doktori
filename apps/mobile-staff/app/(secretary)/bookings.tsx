import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Alert, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";

type Booking = {
  id: string; startsAt: string; endsAt: string; status: string;
  reason: string | null; patientName: string; patientPhone: string; practiceId: string | null;
};
type TabKey = "pending" | "confirmed" | "cancelled" | "requests";

export default function SecretaryBookings() {
  const TABS = [
    { key: "pending" as TabKey,   label: t("secretary.bookings.tabPending") },
    { key: "confirmed" as TabKey, label: t("secretary.bookings.tabConfirmed") },
    { key: "cancelled" as TabKey, label: t("secretary.bookings.tabCancelled") },
    { key: "requests" as TabKey,  label: t("secretary.bookings.tabRequests") },
  ];

  const [tab, setTab] = useState<TabKey>("pending");
  const [all, setAll] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingsResult, requestsResult] = await Promise.allSettled([
        api<Booking[]>("/api/appointments/doctor", { noRedirect: true }),
        api<Booking[]>("/api/appointments/change-requests", { noRedirect: true }),
      ]);
      if (bookingsResult.status === "fulfilled") setAll(bookingsResult.value);
      if (requestsResult.status === "fulfilled")
        setRequests(Array.isArray(requestsResult.value) ? requestsResult.value : []);
    } catch {
      setError(t("secretary.bookings.errorLoad"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);
  const filtered = tab === "requests" ? requests : all.filter((b) => b.status === tab);

  async function updateStatus(id: string, status: "confirmed" | "cancelled") {
    setUpdating(id);
    try {
      await api(`/api/appointments/${id}/status`, { method: "PATCH", body: { status }, noRedirect: true });
      setAll((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally { setUpdating(null); }
  }

  async function respondRequest(id: string, action: "accept" | "decline") {
    setUpdating(`${id}-${action}`);
    try {
      await api(`/api/appointments/${id}/respond-request`, { method: "POST", body: { action }, noRedirect: true });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally { setUpdating(null); }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("secretary.bookings.title")}</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tabItem) => {
          const count = tabItem.key === "requests"
            ? requests.length
            : all.filter((b) => b.status === tabItem.key).length;
          return (
            <Pressable key={tabItem.key} onPress={() => setTab(tabItem.key)}
              style={[styles.tabBtn, tab === tabItem.key && styles.tabBtnActive]}>
              <Text style={[styles.tabText, tab === tabItem.key && styles.tabTextActive]}>{tabItem.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, tab === tabItem.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, tab === tabItem.key && styles.tabBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color={colors.border} />
          <Text style={styles.emptyText}>
            {tab === "pending" ? t("secretary.bookings.emptyPending")
              : tab === "requests" ? t("secretary.bookings.emptyRequests")
              : t("secretary.bookings.emptyDefault")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.bookingDate}>
                  {new Date(item.startsAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  {" · "}
                  {new Date(item.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
                {item.reason && <Text style={styles.reason}>{item.reason}</Text>}
                {tab === "requests" && (
                  <View style={styles.requestStatusBadge}>
                    <Text style={styles.requestStatusText}>
                      {item.status === "reschedule_requested" ? t("secretary.bookings.requestReschedule")
                        : item.status === "cancel_requested" ? t("secretary.bookings.requestCancel")
                        : item.status}
                    </Text>
                  </View>
                )}
              </View>

              {tab === "pending" && (
                <View style={styles.actions}>
                  <Pressable style={[styles.actionBtn, styles.confirmBtn, updating === item.id && { opacity: 0.6 }]}
                    onPress={() => updateStatus(item.id, "confirmed")} disabled={!!updating}>
                    {updating === item.id
                      ? <ActivityIndicator color="#FFF" size={14} />
                      : <Ionicons name="checkmark" size={18} color="#FFF" />}
                  </Pressable>
                  <Pressable style={[styles.actionBtn, styles.cancelBtn, updating === item.id && { opacity: 0.6 }]}
                    onPress={() => Alert.alert(t("secretary.bookings.refuserTitle"), t("secretary.bookings.refuserDesc"), [
                      { text: t("secretary.bookings.refuserNo"), style: "cancel" },
                      { text: t("secretary.bookings.refuserYes"), style: "destructive", onPress: () => updateStatus(item.id, "cancelled") },
                    ])} disabled={!!updating}>
                    <Ionicons name="close" size={18} color="#FFF" />
                  </Pressable>
                </View>
              )}

              {tab === "requests" && (
                <View style={styles.requestActionsCol}>
                  <Pressable style={[styles.acceptBtn, updating === `${item.id}-accept` && { opacity: 0.6 }]}
                    onPress={() => respondRequest(item.id, "accept")} disabled={!!updating}>
                    {updating === `${item.id}-accept`
                      ? <ActivityIndicator color="#FFF" size={14} />
                      : <Text style={styles.acceptBtnText}>{t("secretary.bookings.acceptBtn")}</Text>}
                  </Pressable>
                  <Pressable style={[styles.declineBtn, updating === `${item.id}-decline` && { opacity: 0.6 }]}
                    onPress={() => respondRequest(item.id, "decline")} disabled={!!updating}>
                    {updating === `${item.id}-decline`
                      ? <ActivityIndicator color={colors.foreground} size={14} />
                      : <Text style={styles.declineBtnText}>{t("secretary.bookings.declineBtn")}</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: spacing.sm, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: colors.teal },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  tabTextActive: { color: colors.teal },
  tabBadge: { backgroundColor: colors.border, borderRadius: radii.full, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: colors.teal },
  tabBadgeText: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary },
  tabBadgeTextActive: { color: "#FFF" },
  list: { padding: spacing.xl, gap: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  cardInfo: { flex: 1, gap: 2 },
  patientName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  bookingDate: { fontSize: 13, color: colors.teal, fontWeight: "600" },
  reason: { fontSize: 12, color: colors.foregroundSecondary },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  confirmBtn: { backgroundColor: colors.teal },
  cancelBtn: { backgroundColor: colors.danger },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { fontSize: 15, color: colors.foregroundSecondary },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { color: "#FFF", fontWeight: "700" },
  requestStatusBadge: { alignSelf: "flex-start", marginTop: 4, backgroundColor: "#FFFBEB", borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  requestStatusText: { fontSize: 11, fontWeight: "700", color: "#B45309" },
  requestActionsCol: { gap: spacing.xs },
  acceptBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingVertical: 6, paddingHorizontal: spacing.md, alignItems: "center", minWidth: 80, justifyContent: "center" },
  acceptBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  declineBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: 6, paddingHorizontal: spacing.md, alignItems: "center", minWidth: 80, justifyContent: "center", backgroundColor: colors.bg },
  declineBtnText: { color: colors.foreground, fontWeight: "700", fontSize: 13 },
});
