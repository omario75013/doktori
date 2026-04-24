import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  doctorName: string;
  doctorSpecialty: string;
  doctorAddress: string;
  doctorSlug: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Confirmé", color: colors.teal, bg: colors.bgSecondary },
  pending: { label: "En attente", color: "#B45309", bg: "#FFFBEB" },
  cancelled: { label: "Annulé", color: colors.danger, bg: "#FEF2F2" },
  completed: { label: "Terminé", color: colors.foregroundSecondary, bg: colors.border },
  reschedule_requested: { label: "Décalage demandé", color: "#B45309", bg: "#FFFBEB" },
  cancel_requested: { label: "Annulation demandée", color: "#B91C1C", bg: "#FEF2F2" },
};

async function getPatientToken(): Promise<string | null> {
  const SecureStore = await import("expo-secure-store").catch(() => null);
  return SecureStore ? SecureStore.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientRendezVous() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setError(null);
    try {
      const token = await getPatientToken();
      const data = await api<Appointment[]>("/api/appointments/patient", { token: token ?? undefined });
      setAppointments(data);
    } catch {
      setError("Impossible de charger vos rendez-vous");
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const now = new Date();
  const upcoming = appointments.filter(
    (a) =>
      a.status !== "cancelled" &&
      a.status !== "completed" &&
      new Date(a.startsAt) > now
  );
  const past = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "completed" || new Date(a.endsAt) < now
  );
  const list = tab === "upcoming" ? upcoming : past;

  function canRequestChange(appt: Appointment): boolean {
    return (
      (appt.status === "pending" || appt.status === "confirmed") &&
      new Date(appt.startsAt).getTime() - Date.now() > 2 * 60 * 60 * 1000
    );
  }

  function isChangeRequested(appt: Appointment): boolean {
    return appt.status === "reschedule_requested" || appt.status === "cancel_requested";
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    // Update selected if open
    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, status: newStatus } : prev
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Rendez-vous</Text>
      </View>

      <View style={styles.tabs}>
        {(["upcoming", "past"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "upcoming" ? "À venir" : "Passés"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>Aucun rendez-vous</Text>
          {tab === "upcoming" && (
            <Text style={styles.emptySubText}>Prenez votre premier rendez-vous</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          renderItem={({ item }) => {
            const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
            return (
              <Pressable style={styles.card} onPress={() => setSelected(item)}>
                <View style={styles.cardLeft}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateDay}>{new Date(item.startsAt).getDate()}</Text>
                    <Text style={styles.dateMonth}>
                      {new Date(item.startsAt).toLocaleDateString("fr-FR", { month: "short" })}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardDoctor}>{item.doctorName}</Text>
                  <Text style={styles.cardMeta}>{item.doctorSpecialty}</Text>
                  <Text style={styles.cardTime}>
                    {new Date(item.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)} />
        {selected && (
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetDoctor}>{selected.doctorName}</Text>
            <Text style={styles.sheetMeta}>{selected.doctorSpecialty}</Text>

            <View style={styles.sheetDetails}>
              <SheetRow
                icon="calendar-outline"
                text={new Date(selected.startsAt).toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              />
              <SheetRow
                icon="time-outline"
                text={`${new Date(selected.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} – ${new Date(selected.endsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
              />
              <SheetRow icon="location-outline" text={selected.doctorAddress} />
              {selected.reason && <SheetRow icon="chatbubble-outline" text={selected.reason} />}
            </View>

            {/* Info banner when change request is pending */}
            {isChangeRequested(selected) && (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#92400E" style={{ marginTop: 1 }} />
                <Text style={styles.infoBannerText}>
                  Votre demande est en cours de traitement
                </Text>
              </View>
            )}

            {/* Change request section */}
            {canRequestChange(selected) && (
              <ChangeRequestSection
                appt={selected}
                onSuccess={(newStatus) => {
                  handleStatusUpdate(selected.id, newStatus);
                  setSelected(null);
                }}
              />
            )}
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function ChangeRequestSection({
  appt,
  onSuccess,
}: {
  appt: Appointment;
  onSuccess: (newStatus: string) => void;
}) {
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function requestReschedule() {
    setSubmitting(true);
    try {
      const token = await getPatientToken();
      await api(`/api/appointments/${appt.id}/change-request`, {
        method: "POST",
        token: token ?? undefined,
        body: { type: "reschedule", note: note.trim() || undefined },
      });
      Alert.alert("Demande envoyée", "Votre demande de décalage a été envoyée.");
      onSuccess("reschedule_requested");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function confirmCancelRequest() {
    Alert.alert(
      "Demander une annulation ?",
      "Votre médecin sera notifié de votre demande d'annulation.",
      [
        { text: "Retour", style: "cancel" },
        {
          text: "Confirmer",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              const token = await getPatientToken();
              await api(`/api/appointments/${appt.id}/change-request`, {
                method: "POST",
                token: token ?? undefined,
                body: { type: "cancel" },
              });
              Alert.alert("Demande envoyée", "Votre demande d'annulation a été envoyée.");
              onSuccess("cancel_requested");
            } catch (e) {
              Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.changeSection}>
      <Text style={styles.changeSectionTitle}>Demander une modification</Text>

      {/* Reschedule button / input */}
      {!showRescheduleInput ? (
        <Pressable
          style={styles.outlineTealBtn}
          onPress={() => setShowRescheduleInput(true)}
          disabled={submitting}
        >
          <Text style={styles.outlineTealBtnText}>Demander un décalage</Text>
        </Pressable>
      ) : (
        <View style={styles.rescheduleInputWrap}>
          <TextInput
            style={styles.rescheduleInput}
            value={note}
            onChangeText={setNote}
            placeholder="Note optionnelle (ex: je suis indisponible ce jour-là)"
            placeholderTextColor={colors.foregroundSecondary}
            multiline
            numberOfLines={3}
          />
          <View style={styles.rescheduleActions}>
            <Pressable
              onPress={() => { setShowRescheduleInput(false); setNote(""); }}
              style={styles.cancelTextBtn}
              disabled={submitting}
            >
              <Text style={styles.cancelTextBtnText}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={requestReschedule}
              style={[styles.outlineTealBtn, styles.rescheduleSubmitBtn, submitting && { opacity: 0.6 }]}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.teal} size="small" />
              ) : (
                <Text style={styles.outlineTealBtnText}>Envoyer</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Cancel request button */}
      <Pressable
        style={[styles.outlineDangerBtn, submitting && { opacity: 0.6 }]}
        onPress={confirmCancelRequest}
        disabled={submitting}
      >
        <Text style={styles.outlineDangerBtnText}>Demander une annulation</Text>
      </Pressable>
    </View>
  );
}

function SheetRow({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  return (
    <View style={styles.sheetRow}>
      <Ionicons name={icon} size={16} color={colors.teal} style={{ width: 22 }} />
      <Text style={styles.sheetRowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabBtn: { flex: 1, paddingVertical: spacing.xs + 2, alignItems: "center", borderRadius: radii.sm },
  tabBtnActive: { backgroundColor: colors.bg },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.foregroundSecondary },
  tabTextActive: { color: colors.teal },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing["3xl"], gap: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardLeft: {},
  dateBlock: {
    width: 44,
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: spacing.xs,
  },
  dateDay: { fontSize: 20, fontWeight: "800", color: colors.teal },
  dateMonth: { fontSize: 11, color: colors.foregroundSecondary, textTransform: "uppercase" },
  cardBody: { flex: 1, gap: 2 },
  cardDoctor: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  cardMeta: { fontSize: 12, color: colors.foregroundSecondary },
  cardTime: { fontSize: 12, color: colors.teal, fontWeight: "600" },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full },
  statusText: { fontSize: 11, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { fontSize: 15, color: colors.foregroundSecondary },
  emptySubText: { fontSize: 13, color: colors.foregroundSecondary },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { color: "#FFF", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii["3xl"],
    borderTopRightRadius: radii["3xl"],
    padding: spacing.xl,
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  sheetDoctor: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  sheetMeta: { fontSize: 14, color: colors.foregroundSecondary },
  sheetDetails: { gap: spacing.sm },
  sheetRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  sheetRowText: { flex: 1, fontSize: 14, color: colors.foreground },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  infoBannerText: { flex: 1, fontSize: 13, color: "#92400E", fontWeight: "600" },
  changeSection: { gap: spacing.sm, marginTop: spacing.xs },
  changeSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  outlineTealBtn: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  outlineTealBtnText: { color: colors.teal, fontWeight: "700", fontSize: 14 },
  outlineDangerBtn: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  outlineDangerBtnText: { color: colors.danger, fontWeight: "700", fontSize: 14 },
  rescheduleInputWrap: { gap: spacing.sm },
  rescheduleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.foreground,
    minHeight: 72,
    textAlignVertical: "top",
  },
  rescheduleActions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  cancelTextBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  cancelTextBtnText: { color: colors.foregroundSecondary, fontSize: 13 },
  rescheduleSubmitBtn: { flex: 1 },
});
