import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { formatDate } from "./_ui";

type ApptStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

type DoctorAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ApptStatus;
  type: string;
  reason: string | null;
  patientName: string | null;
  patientPhone: string | null;
};

type FilterKey = "all" | "pending" | "confirmed" | "completed";

const HOME_VISIT_TYPES = new Set(["home_visit", "domicile"]);

function parseAddress(reason: string | null): { address: string | null; note: string | null } {
  if (!reason) return { address: null, note: null };
  const m = reason.match(/^\[Adresse:\s*([^\]]+)\]\s*(.*)$/);
  if (!m) return { address: null, note: reason.trim() || null };
  const address = m[1]?.trim() || null;
  const note = (m[2] || "").trim();
  return { address, note: note || null };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function statusColor(status: ApptStatus): { bg: string; fg: string } {
  switch (status) {
    case "pending":
      return { bg: "#FEF3C7", fg: "#92400E" };
    case "confirmed":
      return { bg: "#D1FAE5", fg: "#065F46" };
    case "completed":
      return { bg: "#DBEAFE", fg: "#1E40AF" };
    case "cancelled":
    case "no_show":
      return { bg: "#FEE2E2", fg: "#991B1B" };
    default:
      return { bg: colors.bgSecondary, fg: colors.foreground };
  }
}

function statusLabel(status: ApptStatus): string {
  return t(`doctor.domicile.status.${status}`);
}

export default function DomicileScreen() {
  const [rows, setRows] = useState<DoctorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    try {
      const data = await api<DoctorAppointment[]>(
        "/api/appointments/doctor",
        { noRedirect: true }
      );
      const onlyHomeVisits = (Array.isArray(data) ? data : []).filter((r) =>
        HOME_VISIT_TYPES.has(r.type)
      );
      setRows(onlyHomeVisits);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  async function updateStatus(id: string, status: ApptStatus) {
    setUpdatingId(id);
    try {
      await api(`/api/appointments/${id}`, {
        method: "PATCH",
        body: { status },
        noRedirect: true,
      });
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch {
      Alert.alert(t("doctor.domicile.errorUpdate"));
    } finally {
      setUpdatingId(null);
    }
  }

  function confirmAccept(id: string) {
    Alert.alert(
      t("doctor.domicile.acceptTitle"),
      t("doctor.domicile.acceptConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("doctor.domicile.accept"),
          onPress: () => updateStatus(id, "confirmed"),
        },
      ]
    );
  }

  function confirmDecline(id: string) {
    Alert.alert(
      t("doctor.domicile.declineTitle"),
      t("doctor.domicile.declineConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("doctor.domicile.decline"),
          style: "destructive",
          onPress: () => updateStatus(id, "cancelled"),
        },
      ]
    );
  }

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: t("doctor.domicile.filterAll"), count: rows.length },
    {
      key: "pending",
      label: t("doctor.domicile.filterPending"),
      count: pendingCount,
    },
    {
      key: "confirmed",
      label: t("doctor.domicile.filterConfirmed"),
    },
    {
      key: "completed",
      label: t("doctor.domicile.filterCompleted"),
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.domicile.title"),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ paddingHorizontal: spacing.sm }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />

      <View style={s.root}>
        <View style={s.header}>
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>{t("doctor.domicile.title")}</Text>
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{rows.length}</Text>
            </View>
          </View>
          <Text style={s.headerSub}>{t("doctor.domicile.subtitle")}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
          style={s.chipsScroll}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {f.label}
                  {typeof f.count === "number" ? ` (${f.count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          style={s.list}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
        >
          {loading ? (
            <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["2xl"] }} />
          ) : filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="home-outline" size={48} color={colors.border} />
              <Text style={s.emptyTitle}>{t("doctor.domicile.empty")}</Text>
              <Text style={s.emptySub}>{t("doctor.domicile.emptySub")}</Text>
            </View>
          ) : (
            filtered.map((r) => {
              const { address, note } = parseAddress(r.reason);
              const isExpanded = expandedId === r.id;
              const isUpdating = updatingId === r.id;
              const colors_ = statusColor(r.status);

              return (
                <Pressable
                  key={r.id}
                  style={s.card}
                  onPress={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.patientName}>
                        {r.patientName || t("doctor.domicile.unknownPatient")}
                      </Text>
                      <View style={s.metaRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color={colors.foregroundSecondary}
                        />
                        <Text style={s.metaText}>
                          {formatDate(r.startsAt)} · {fmtTime(r.startsAt)}
                        </Text>
                      </View>
                      {address ? (
                        <View style={s.metaRow}>
                          <Ionicons
                            name="location-outline"
                            size={13}
                            color={colors.foregroundSecondary}
                          />
                          <Text style={s.metaText} numberOfLines={isExpanded ? undefined : 1}>
                            {address}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: colors_.bg }]}>
                      <Text style={[s.statusBadgeText, { color: colors_.fg }]}>
                        {statusLabel(r.status)}
                      </Text>
                    </View>
                  </View>

                  {isExpanded ? (
                    <View style={s.expanded}>
                      {r.patientPhone ? (
                        <View style={s.kvRow}>
                          <Text style={s.kvLabel}>{t("doctor.domicile.phone")}</Text>
                          <Text style={s.kvValue}>{r.patientPhone}</Text>
                        </View>
                      ) : null}
                      <View style={s.kvRow}>
                        <Text style={s.kvLabel}>{t("doctor.domicile.requestedAt")}</Text>
                        <Text style={s.kvValue}>
                          {formatDate(r.startsAt)} · {fmtTime(r.startsAt)} – {fmtTime(r.endsAt)}
                        </Text>
                      </View>
                      {note ? (
                        <View style={s.noteBox}>
                          <Text style={s.noteLabel}>{t("doctor.domicile.note")}</Text>
                          <Text style={s.noteText}>{note}</Text>
                        </View>
                      ) : null}

                      {r.status === "pending" ? (
                        <View style={s.actionsRow}>
                          <Pressable
                            style={[s.actionBtn, s.declineBtn, isUpdating && { opacity: 0.5 }]}
                            disabled={isUpdating}
                            onPress={() => confirmDecline(r.id)}
                          >
                            <Ionicons name="close" size={16} color="#fff" />
                            <Text style={s.actionBtnText}>
                              {t("doctor.domicile.decline")}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[s.actionBtn, s.acceptBtn, isUpdating && { opacity: 0.5 }]}
                            disabled={isUpdating}
                            onPress={() => confirmAccept(r.id)}
                          >
                            {isUpdating ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark" size={16} color="#fff" />
                                <Text style={s.actionBtnText}>
                                  {t("doctor.domicile.accept")}
                                </Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      ) : r.status === "confirmed" ? (
                        <View style={s.actionsRow}>
                          <Pressable
                            style={[s.actionBtn, s.completeBtn, isUpdating && { opacity: 0.5 }]}
                            disabled={isUpdating}
                            onPress={() => updateStatus(r.id, "completed")}
                          >
                            {isUpdating ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-done" size={16} color="#fff" />
                                <Text style={s.actionBtnText}>
                                  {t("doctor.domicile.markCompleted")}
                                </Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  countBadge: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: "center",
  },
  countBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  headerSub: { fontSize: 13, color: colors.foregroundSecondary },
  chipsScroll: { flexGrow: 0, paddingVertical: spacing.sm },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  chipTextActive: { color: "#fff" },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing["3xl"] },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  patientName: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  metaText: { fontSize: 12, color: colors.foregroundSecondary, flex: 1 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  expanded: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  kvLabel: { fontSize: 12, color: colors.foregroundSecondary },
  kvValue: { fontSize: 12, fontWeight: "600", color: colors.foreground, flex: 1, textAlign: "right" },
  noteBox: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noteText: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  acceptBtn: { backgroundColor: colors.teal },
  declineBtn: { backgroundColor: colors.danger },
  completeBtn: { backgroundColor: "#1E40AF" },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", paddingVertical: spacing["3xl"], gap: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  emptySub: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
});
