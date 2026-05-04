import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Loader, Empty, formatDate } from "./_ui";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt?: string;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientPhone: string;
  patientId?: string;
  practiceId?: string | null;
};

type ApptDetail = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientId: string;
};

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending:               { bg: "#FED7AA", fg: "#9A3412" },
  confirmed:             { bg: "#E0F2FE", fg: "#075985" },
  completed:             { bg: "#DBEAFE", fg: "#1E40AF" },
  cancelled:             { bg: "#E5E7EB", fg: "#4B5563" },
  no_show:               { bg: "#FECACA", fg: "#991B1B" },
  reschedule_requested:  { bg: "#FFFBEB", fg: "#B45309" },
  cancel_requested:      { bg: "#FEF2F2", fg: "#B91C1C" },
};

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:               t("doctor.rdv.statusToConfirm"),
    confirmed:             t("doctor.rdv.statusConfirmed"),
    completed:             t("doctor.rdv.statusCompleted"),
    cancelled:             t("doctor.rdv.statusCancelled"),
    no_show:               t("doctor.rdv.statusAbsent"),
    reschedule_requested:  t("doctor.rdv.rescheduleRequest"),
    cancel_requested:      t("doctor.rdv.cancelRequest"),
  };
  return map[status] ?? status;
}

function getFilters() {
  return [
    { id: "all",       label: t("doctor.rdv.tabAll") },
    { id: "pending",   label: t("doctor.rdv.tabToConfirm") },
    { id: "confirmed", label: t("doctor.rdv.tabConfirmed") },
    { id: "completed", label: t("doctor.rdv.tabCompleted") },
    { id: "cancelled", label: t("doctor.rdv.tabCancelled") },
    { id: "no_show",   label: t("doctor.rdv.tabAbsent") },
    { id: "requests",  label: t("doctor.rdv.tabRequests") },
  ] as const;
}

type FilterId = "all" | "pending" | "confirmed" | "completed" | "cancelled" | "no_show" | "requests";

export default function AllRendezVous() {
  const { locale } = useLocale();
  const [all, setAll] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [appts, reqs] = await Promise.allSettled([
        api<Appointment[]>("/api/appointments/doctor"),
        api<Appointment[]>("/api/appointments/change-requests"),
      ]);
      if (appts.status === "fulfilled") setAll(Array.isArray(appts.value) ? appts.value : []);
      if (reqs.status === "fulfilled") setRequests(Array.isArray(reqs.value) ? reqs.value : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function respondRequest(id: string, action: "accept" | "decline") {
    setRespondingId(`${id}-${action}`);
    try {
      await api(`/api/appointments/${id}/respond-request`, {
        method: "POST",
        body: { action },
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setRespondingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "requests") return requests;
    let list = all;
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.patientPhone.includes(q) ||
          (a.reason?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [all, requests, filter, query]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.rdv.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `${t("doctor.rdv.title")} (${all.length})` }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.foregroundSecondary} />
          <TextInput
            placeholder={t("doctor.rdv.searchPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.foregroundSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.filtersRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
            data={getFilters()}
            keyExtractor={(f) => f.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setFilter(item.id)}
                style={[styles.chip, filter === item.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, filter === item.id && { color: "#FFFFFF" }]}>
                  {item.label}
                </Text>
                {item.id === "requests" && requests.length > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{requests.length}</Text>
                  </View>
                )}
              </Pressable>
            )}
          />
        </View>

        {filter === "requests" ? (
          <FlatList
            data={filtered}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); void load(); }}
                tintColor={colors.teal}
              />
            }
            ListEmptyComponent={<Empty icon="checkmark-circle-outline" title={t("doctor.rdv.noRequests")} />}
            renderItem={({ item }) => (
              <RequestRow
                appt={item}
                respondingId={respondingId}
                onAccept={() => respondRequest(item.id, "accept")}
                onDecline={() => respondRequest(item.id, "decline")}
              />
            )}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); void load(); }}
                tintColor={colors.teal}
              />
            }
            ListEmptyComponent={<Empty icon="calendar-outline" title={t("doctor.rdv.noAppointments")} />}
            renderItem={({ item }) => (
              <ApptRow appt={item} onPress={() => setSelected(item)} />
            )}
          />
        )}
      </View>

      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <ApptDetailModal
            appt={selected}
            onClose={() => setSelected(null)}
            onChanged={() => { void load(); setSelected(null); }}
          />
        )}
      </Modal>
    </>
  );
}

function RequestRow({
  appt,
  respondingId,
  onAccept,
  onDecline,
}: {
  appt: Appointment;
  respondingId: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const start = new Date(appt.startsAt);
  const hhmm = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const tone = STATUS_TONES[appt.status] ?? { bg: colors.bgSecondary, fg: colors.teal };
  const isAccepting = respondingId === `${appt.id}-accept`;
  const isDeclining = respondingId === `${appt.id}-decline`;
  const isBusy = isAccepting || isDeclining;

  return (
    <View style={styles.row}>
      <View style={styles.date}>
        <Text style={styles.dateText}>{formatDate(appt.startsAt)}</Text>
        <Text style={styles.timeText}>{hhmm}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{appt.patientName}</Text>
        <Text style={styles.phone}>{appt.patientPhone}</Text>
        {appt.reason && (
          <Text style={styles.reason} numberOfLines={2}>
            {appt.reason}
          </Text>
        )}
        <View style={[styles.badge, { backgroundColor: tone.bg, marginTop: 4, alignSelf: "flex-start" }]}>
          <Text style={[styles.badgeText, { color: tone.fg }]}>
            {getStatusLabel(appt.status)}
          </Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            onPress={onAccept}
            disabled={isBusy}
            style={[styles.acceptBtn, isBusy && { opacity: 0.6 }]}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.acceptBtnText}>{t("doctor.rdv.accept")}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onDecline}
            disabled={isBusy}
            style={[styles.declineBtn, isBusy && { opacity: 0.6 }]}
          >
            {isDeclining ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <Text style={styles.declineBtnText}>{t("doctor.rdv.decline")}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ApptRow({ appt, onPress }: { appt: Appointment; onPress: () => void }) {
  const start = new Date(appt.startsAt);
  const hhmm = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const tone = STATUS_TONES[appt.status] ?? { bg: colors.bgSecondary, fg: colors.teal };
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.date}>
        <Text style={styles.dateText}>{formatDate(appt.startsAt)}</Text>
        <Text style={styles.timeText}>{hhmm}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{appt.patientName}</Text>
        <Text style={styles.phone}>{appt.patientPhone}</Text>
        {appt.reason && <Text style={styles.reason} numberOfLines={1}>{appt.reason}</Text>}
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.badgeText, { color: tone.fg }]}>
            {getStatusLabel(appt.status)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.foregroundSecondary} />
      </View>
    </Pressable>
  );
}

function ApptDetailModal({
  appt,
  onClose,
  onChanged,
}: {
  appt: Appointment;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editReason, setEditReason] = useState(appt.reason ?? "");
  const [saving, setSaving] = useState(false);

  const start = new Date(appt.startsAt);
  const tone = STATUS_TONES[appt.status] ?? { bg: colors.bgSecondary, fg: colors.teal };

  async function updateStatus(status: string, label: string) {
    Alert.alert(t("doctor.rdv.markAs", { label }), t("doctor.rdv.confirmFor", { name: appt.patientName }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        onPress: async () => {
          setBusy(status);
          try {
            await api(`/api/appointments/${appt.id}/status`, {
              method: "PATCH",
              body: { status },
            });
            onChanged();
          } catch (e) {
            Alert.alert(t("common.error"), e instanceof Error ? e.message : t("doctor.rdv.updateFailed"));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  async function saveReason() {
    setSaving(true);
    try {
      await api(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        body: { reason: editReason || null },
      });
      onChanged();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
      setEditOpen(false);
    }
  }

  const actions = [
    { status: "confirmed", label: t("doctor.rdv.statusConfirmed"), icon: "checkmark-circle" as const, color: colors.teal },
    { status: "completed", label: t("doctor.rdv.statusCompleted"), icon: "checkmark-done-circle" as const, color: "#3B82F6" },
    { status: "no_show",   label: t("doctor.rdv.statusAbsent"), icon: "person-remove" as const, color: "#EF4444" },
    { status: "cancelled", label: t("doctor.rdv.statusCancelled"), icon: "close-circle" as const, color: "#6B7280" },
  ].filter((a) => a.status !== appt.status);

  return (
    <View style={styles.modal}>
      <View style={styles.modalHead}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.modalTitle} numberOfLines={1}>{appt.patientName}</Text>
        <Pressable onPress={() => setEditOpen(true)} style={styles.modalClose}>
          <Ionicons name="create-outline" size={20} color={colors.teal} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.modalBody}>
        {/* Status badge */}
        <View style={[styles.statusRow, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusLabel, { color: tone.fg }]}>
            {getStatusLabel(appt.status)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <InfoRow icon="calendar" label="Date">
            {start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </InfoRow>
          <InfoRow icon="time" label="Heure">
            {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </InfoRow>
          <InfoRow icon="call" label={t("doctor.patients.fieldPhone")}>{appt.patientPhone}</InfoRow>
          {appt.type && (
            <InfoRow icon="videocam" label={t("doctor.motifs.type")}>
              {{ cabinet: t("doctor.motifs.typeCabinet"), teleconsult: t("doctor.teleconsult.title"), domicile: "Domicile" }[appt.type] ?? appt.type}
            </InfoRow>
          )}
          {appt.reason && (
            <InfoRow icon="document-text" label={t("doctor.rdv.reasonLabel")}>{appt.reason}</InfoRow>
          )}
        </View>

        {/* Edit reason */}
        {editOpen && (
          <View style={styles.editBox}>
            <Text style={styles.editLabel}>{t("doctor.rdv.reasonLabel")}</Text>
            <TextInput
              value={editReason}
              onChangeText={setEditReason}
              placeholder={t("doctor.rdv.reasonPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              style={styles.editInput}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable onPress={() => setEditOpen(false)} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable onPress={saveReason} disabled={saving} style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}>
                <Text style={styles.editSaveText}>{saving ? "…" : t("doctor.rdv.save")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Status actions */}
        <Text style={styles.actionsTitle}>{t("doctor.rdv.actions")}</Text>
        <View style={styles.actionsGrid}>
          {actions.map((a) => (
            <Pressable
              key={a.status}
              onPress={() => updateStatus(a.status, a.label)}
              disabled={busy === a.status}
              style={[styles.actionBtn, { borderColor: a.color }]}
            >
              {busy === a.status ? (
                <ActivityIndicator size="small" color={a.color} />
              ) : (
                <Ionicons name={a.icon} size={20} color={a.color} />
              )}
              <Text style={[styles.actionBtnText, { color: a.color }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={colors.teal} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
  filtersRow: { paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  chipActive: { backgroundColor: colors.teal },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  date: {
    width: 72,
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  dateText: { fontSize: 10, fontWeight: "700", color: colors.teal },
  timeText: { fontSize: 13, fontWeight: "800", color: colors.foreground, fontFamily: "monospace" },
  name: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  phone: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2, fontFamily: "monospace" },
  reason: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: "700" },

  modal: { flex: 1, backgroundColor: colors.bg },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
  modalBody: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },

  statusRow: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  statusLabel: { fontSize: 13, fontWeight: "700" },

  infoCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { width: 80, fontSize: 12, color: colors.foregroundSecondary, fontWeight: "600" },
  infoValue: { flex: 1, fontSize: 13, color: colors.foreground },

  editBox: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
  },
  editLabel: { fontSize: 12, fontWeight: "700", color: colors.foregroundSecondary, textTransform: "uppercase" },
  editInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: "top",
  },
  editCancelBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  editCancelText: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  editSaveBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: "center",
  },
  editSaveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  actionsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: colors.bg,
    minWidth: "45%",
    flex: 1,
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  filterBadge: {
    backgroundColor: "#FFF",
    borderRadius: radii.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  filterBadgeText: { fontSize: 10, fontWeight: "800", color: colors.teal },
  requestActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minHeight: 34,
    justifyContent: "center",
  },
  acceptBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minHeight: 34,
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  declineBtnText: { color: colors.foreground, fontWeight: "700", fontSize: 13 },
});
