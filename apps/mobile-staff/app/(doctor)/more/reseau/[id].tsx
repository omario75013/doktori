import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Loader } from "../_ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type PeerProfile = {
  id: string;
  name: string;
  specialty: string | null;
  city: string | null;
  photoUrl: string | null;
  bio?: string | null;
  consultationFee?: number | null;
  teleconsultFee?: number | null;
  yearsOfExperience?: number | null;
  languages?: string[] | null;
  expertise?: string[] | null;
  averageRating?: number | string | null;
  reviewCount?: number | null;
  slug?: string | null;
};

type ConnectionRow = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "blocked" | "declined";
};

type ConnState = "none" | "pending_out" | "pending_in" | "accepted" | "blocked";

type Patient = { id: string; name: string; phone?: string | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function stars(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PeerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const peerId = String(id ?? "");

  const [profile, setProfile] = useState<PeerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connState, setConnState] = useState<ConnState>("none");
  const [connSubmitting, setConnSubmitting] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [referOpen, setReferOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Try peers (accepted network) first — gives basic name/specialty/photo
      let base: PeerProfile | null = null;
      const peers = await api<PeerProfile[]>("/api/doctor/network/peers").catch(
        () => [] as PeerProfile[]
      );
      const match = peers.find((p) => p.id === peerId);
      if (match) base = { ...match };

      // Enrich via search by name if we have one — gives fees, bio, rating…
      if (base?.name) {
        try {
          const r = await api<{ hits?: PeerProfile[]; doctors?: PeerProfile[] }>(
            `/api/search?q=${encodeURIComponent(base.name)}`
          );
          const hits = r.hits ?? r.doctors ?? [];
          const enriched = hits.find((h) => h.id === peerId);
          if (enriched) base = { ...base, ...enriched };
        } catch {
          /* ignore */
        }
      }

      // If still nothing, last-resort generic search by id
      if (!base) {
        try {
          const r = await api<{ hits?: PeerProfile[]; doctors?: PeerProfile[] }>(
            `/api/search?q=${encodeURIComponent(peerId)}`
          );
          const hits = r.hits ?? r.doctors ?? [];
          base = hits.find((h) => h.id === peerId) ?? null;
        } catch {
          /* ignore */
        }
      }

      setProfile(base);

      // Connection status
      const rows = await api<ConnectionRow[]>(
        "/api/doctor/network/connect"
      ).catch(() => [] as ConnectionRow[]);
      const me = await api<{ id: string }>("/api/doctor/me").catch(() => null);
      const row = rows.find(
        (r) => r.requesterId === peerId || r.addresseeId === peerId
      );
      if (!row) {
        setConnState("none");
      } else if (row.status === "accepted") {
        setConnState("accepted");
      } else if (row.status === "blocked") {
        setConnState("blocked");
      } else if (row.status === "pending") {
        // Outgoing = the row's addressee is the peer; incoming = me is addressee
        if (me && row.addresseeId === peerId) setConnState("pending_out");
        else setConnState("pending_in");
      }
    } finally {
      setLoading(false);
    }
  }, [peerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    if (connState !== "none" || connSubmitting) return;
    setConnSubmitting(true);
    try {
      await api("/api/doctor/network/connect", {
        method: "POST",
        body: { addresseeId: peerId },
      });
      setConnState("pending_out");
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    } finally {
      setConnSubmitting(false);
    }
  }

  async function handleMessage() {
    if (!profile) return;
    setMessageSending(true);
    try {
      const res = await api<{ id: string; conversation?: { id: string } }>(
        "/api/doctor/peer-conversations",
        { method: "POST", body: { peerId } }
      );
      const convId = res.conversation?.id ?? res.id;
      router.push({
        pathname: "/(doctor)/chat/[id]",
        params: {
          id: convId,
          kind: "peer",
          peerName: profile.name,
          peerId,
        },
      });
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    } finally {
      setMessageSending(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.reseauPeer.title") }} />
        <Loader />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.reseauPeer.title") }} />
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.foregroundSecondary} />
          <Text style={styles.emptyText}>{t("doctor.reseauPeer.notFound")}</Text>
        </View>
      </>
    );
  }

  const rating = Number(profile.averageRating ?? 0);
  const reviewCount = Number(profile.reviewCount ?? 0);

  // Connect button copy/cls
  const connBtnLabel = (() => {
    if (connSubmitting) return t("common.sending");
    switch (connState) {
      case "accepted":
        return t("doctor.reseauPeer.connected");
      case "pending_out":
        return t("doctor.reseau.inviteSent");
      case "pending_in":
        return t("doctor.reseauPeer.acceptInvitation");
      case "blocked":
        return t("doctor.reseauPeer.blocked");
      default:
        return t("doctor.reseau.connect");
    }
  })();
  const connBtnDisabled =
    connSubmitting ||
    connState === "accepted" ||
    connState === "pending_out" ||
    connState === "blocked";

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.reseauPeer.title"), headerShadowVisible: false }} />

      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{initialsOf(profile.name)}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.metaRow}>
            {profile.specialty ? (
              <View style={styles.metaItem}>
                <Ionicons name="medkit-outline" size={13} color={colors.teal} />
                <Text style={styles.metaText}>{profile.specialty}</Text>
              </View>
            ) : null}
            {profile.city ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={colors.foregroundSecondary} />
                <Text style={styles.metaTextMuted}>{profile.city}</Text>
              </View>
            ) : null}
          </View>
          {rating > 0 ? (
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>{stars(rating)}</Text>
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              {reviewCount > 0 ? (
                <Text style={styles.ratingCount}>
                  {t("doctor.reseauPeer.reviews", { count: reviewCount })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleConnect}
            disabled={connBtnDisabled}
            style={[
              styles.actionBtn,
              styles.actionBtnPrimary,
              connBtnDisabled && styles.actionBtnDisabled,
            ]}
          >
            {connSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={connState === "accepted" ? "checkmark" : "person-add-outline"}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.actionBtnPrimaryText}>{connBtnLabel}</Text>
              </>
            )}
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleMessage}
              disabled={messageSending}
              style={[
                styles.actionBtnSmall,
                styles.actionBtnSecondary,
                messageSending && styles.actionBtnDisabled,
              ]}
            >
              {messageSending ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={15} color={colors.teal} />
                  <Text style={styles.actionBtnSecondaryText}>
                    {t("doctor.reseauPeer.messageButton")}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => setReferOpen(true)}
              style={[styles.actionBtnSmall, styles.actionBtnGhost]}
            >
              <Ionicons name="arrow-redo-outline" size={15} color={colors.foreground} />
              <Text style={styles.actionBtnGhostText}>
                {t("doctor.reseauPeer.referButton")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bio */}
        {profile.bio ? (
          <Section title={t("doctor.reseauPeer.about")}>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </Section>
        ) : null}

        {/* Info */}
        <Section title={t("doctor.reseauPeer.info")}>
          <View style={styles.infoGrid}>
            {profile.yearsOfExperience != null ? (
              <View style={styles.infoChip}>
                <Ionicons name="time-outline" size={14} color={colors.teal} />
                <Text style={styles.infoChipText}>
                  {profile.yearsOfExperience} {t("doctor.reseau.yearsExp")}
                </Text>
              </View>
            ) : null}
            {profile.consultationFee != null ? (
              <View style={styles.infoChip}>
                <Ionicons name="cash-outline" size={14} color={colors.teal} />
                <Text style={styles.infoChipText}>
                  {t("doctor.reseauPeer.consultation")} {profile.consultationFee} DT
                </Text>
              </View>
            ) : null}
            {profile.teleconsultFee != null ? (
              <View style={styles.infoChip}>
                <Ionicons name="videocam-outline" size={14} color={colors.teal} />
                <Text style={styles.infoChipText}>
                  {t("doctor.reseauPeer.teleconsult")} {profile.teleconsultFee} DT
                </Text>
              </View>
            ) : null}
          </View>
        </Section>

        {/* Languages */}
        {profile.languages && profile.languages.length > 0 ? (
          <Section title={t("doctor.reseauPeer.languages")}>
            <View style={styles.tagRow}>
              {profile.languages.map((l) => (
                <View key={l} style={styles.tag}>
                  <Text style={styles.tagText}>{l}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {/* Expertise */}
        {profile.expertise && profile.expertise.length > 0 ? (
          <Section title={t("doctor.reseauPeer.expertise")}>
            <View style={styles.tagRow}>
              {profile.expertise.map((e) => (
                <View key={e} style={[styles.tag, styles.tagTeal]}>
                  <Text style={[styles.tagText, styles.tagTealText]}>{e}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}
      </ScrollView>

      {referOpen && profile ? (
        <ReferralModal
          toDoctorId={profile.id}
          toDoctorName={profile.name}
          onClose={() => setReferOpen(false)}
          onSuccess={() => {
            setReferOpen(false);
            Alert.alert(t("common.ok"), t("doctor.reseauPeer.referralCreated"));
          }}
        />
      ) : null}
    </>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Referral Modal ───────────────────────────────────────────────────────────

function ReferralModal({
  toDoctorId,
  toDoctorName,
  onClose,
  onSuccess,
}: {
  toDoctorId: string;
  toDoctorName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [shareRecord, setShareRecord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<Patient[]>("/api/doctor/patients")
      .then((rows) => setPatients(rows ?? []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? patients.filter((p) =>
        `${p.name} ${p.phone ?? ""}`.toLowerCase().includes(search.toLowerCase())
      )
    : patients;

  async function submit() {
    if (!selectedId) {
      Alert.alert(t("common.error"), t("doctor.reseauPeer.errorNoPatient"));
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert(t("common.error"), t("doctor.reseauPeer.errorReason"));
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/doctor/referrals", {
        method: "POST",
        body: {
          toDoctorId,
          patientId: selectedId,
          reason: reason.trim(),
          shareMedicalRecord: shareRecord,
          notesForReceivingDoctor: notes.trim() ? notes.trim() : null,
        },
      });
      onSuccess();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>{t("doctor.reseauPeer.referTitle")}</Text>
            <Text style={styles.modalSub}>
              {t("doctor.reseauPeer.referTo", { name: toDoctorName })}
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody}>
          <Text style={styles.fieldLabel}>{t("doctor.reseauPeer.selectPatient")}</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={15} color={colors.foregroundSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("doctor.reseauPeer.searchPatient")}
              placeholderTextColor={colors.foregroundSecondary}
              style={styles.searchInput}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.teal} style={{ marginVertical: spacing.md }} />
          ) : filtered.length === 0 ? (
            <Text style={styles.empty}>{t("doctor.reseauPeer.noPatients")}</Text>
          ) : (
            <View style={styles.patientList}>
              {filtered.slice(0, 50).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedId(p.id)}
                  style={[
                    styles.patientRow,
                    selectedId === p.id && styles.patientRowActive,
                  ]}
                >
                  {selectedId === p.id ? (
                    <Ionicons name="checkmark" size={14} color={colors.teal} />
                  ) : (
                    <View style={{ width: 14 }} />
                  )}
                  <Text style={styles.patientName} numberOfLines={1}>{p.name}</Text>
                  {p.phone ? (
                    <Text style={styles.patientPhone}>{p.phone}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
            {t("doctor.reseauPeer.reasonLabel")}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder={t("doctor.reseauPeer.reasonPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
            style={[styles.textarea, { minHeight: 80 }]}
          />

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
            {t("doctor.reseauPeer.notesLabel")}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[styles.textarea, { minHeight: 60 }]}
          />

          <Pressable
            onPress={() => setShareRecord((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, shareRecord && styles.checkboxOn]}>
              {shareRecord ? <Ionicons name="checkmark" size={12} color="#FFF" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkLabel}>{t("doctor.reseauPeer.shareRecord")}</Text>
              <Text style={styles.checkSub}>{t("doctor.reseauPeer.shareRecordDesc")}</Text>
            </View>
          </Pressable>
        </ScrollView>

        <View style={styles.modalActions}>
          <Pressable onPress={onClose} disabled={submitting} style={[styles.actionBtnSmall, styles.actionBtnGhost, { flex: 1 }]}>
            <Text style={styles.actionBtnGhostText}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={submitting || !selectedId}
            style={[
              styles.actionBtnSmall,
              styles.actionBtnPrimary,
              { flex: 1 },
              (submitting || !selectedId) && styles.actionBtnDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnPrimaryText}>
                {t("doctor.reseauPeer.submitReferral")}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing["2xl"] },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyText: { color: colors.foregroundSecondary, fontSize: 14 },

  hero: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.bgSecondary },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.tealDark },
  avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 30 },
  name: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginTop: spacing.sm, textAlign: "center" },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: 4, flexWrap: "wrap", justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: colors.teal, fontWeight: "600" },
  metaTextMuted: { fontSize: 13, color: colors.foregroundSecondary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  stars: { fontSize: 13, color: colors.amber },
  ratingValue: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  ratingCount: { fontSize: 12, color: colors.foregroundSecondary },

  actions: { gap: spacing.sm },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 13,
    borderRadius: radii.md,
  },
  actionBtnSmall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.md,
  },
  actionBtnPrimary: { backgroundColor: colors.teal },
  actionBtnPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  actionBtnSecondary: { borderWidth: 1, borderColor: colors.teal, backgroundColor: colors.bg },
  actionBtnSecondaryText: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  actionBtnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  actionBtnGhostText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  actionBtnDisabled: { opacity: 0.6 },

  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bioText: { fontSize: 14, color: colors.foreground, lineHeight: 21 },

  infoGrid: { gap: spacing.sm },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoChipText: { fontSize: 13, color: colors.foreground, fontWeight: "600" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { fontSize: 12, color: colors.foreground, fontWeight: "600" },
  tagTeal: { backgroundColor: "#CFFAFE", borderColor: "#A5F3FC" },
  tagTealText: { color: colors.tealDark },

  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: colors.foreground },
  modalSub: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  modalBody: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing["2xl"] },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.foreground },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    marginTop: 4,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.foreground, padding: 0 },
  empty: { fontSize: 12, color: colors.foregroundSecondary, fontStyle: "italic", textAlign: "center", paddingVertical: spacing.md },
  patientList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  patientRowActive: { backgroundColor: "#CFFAFE" },
  patientName: { flex: 1, fontSize: 13, color: colors.foreground },
  patientPhone: { fontSize: 11, color: colors.foregroundSecondary },

  textarea: {
    marginTop: 4,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    fontSize: 13,
    color: colors.foreground,
    textAlignVertical: "top",
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  checkLabel: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  checkSub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
});
