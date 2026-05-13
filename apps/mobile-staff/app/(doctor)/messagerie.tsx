import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

type DoctorStatus = {
  statusMessage: string | null;
  awayMessage: string | null;
  statusActiveUntil: string | null;
  isActive: boolean;
};

type Conversation = {
  id: string;
  peerId?: string;
  peerType?: "doctor" | "secretary";
  peerName?: string;
  peerSpecialty?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  unread?: number;
  // patient shape extras
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
};

type Tab = "medecins" | "equipe";

export default function MessagerieScreen() {
  const { locale } = useLocale();
  const [tab, setTab] = useState<Tab>("medecins");
  const [team, setTeam] = useState<Conversation[]>([]);
  const [peers, setPeers] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docStatus, setDocStatus] = useState<DoctorStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [awayMsg, setAwayMsg] = useState("");
  const [statusUntil, setStatusUntil] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api<DoctorStatus>("/api/doctor/status", { noRedirect: true });
      setDocStatus(s);
    } catch {
      setDocStatus(null);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  function openStatusModal() {
    setStatusMsg(docStatus?.statusMessage ?? "");
    setAwayMsg(docStatus?.awayMessage ?? "");
    setStatusUntil(docStatus?.statusActiveUntil?.slice(0, 10) ?? "");
    setShowStatusModal(true);
  }

  async function saveStatus() {
    setSavingStatus(true);
    try {
      const updated = await api<DoctorStatus>("/api/doctor/status", {
        method: "PATCH",
        body: {
          statusMessage: statusMsg.trim() || null,
          awayMessage: awayMsg.trim() || null,
          statusActiveUntil: statusUntil || null,
        },
        noRedirect: true,
      });
      setDocStatus(updated);
      setShowStatusModal(false);
    } catch {
      Alert.alert(t("common.error"), t("doctor.status.saveError"));
    } finally {
      setSavingStatus(false);
    }
  }

  async function clearStatus() {
    setSavingStatus(true);
    try {
      const updated = await api<DoctorStatus>("/api/doctor/status", {
        method: "PATCH",
        body: { statusMessage: null, awayMessage: null, statusActiveUntil: null },
        noRedirect: true,
      });
      setDocStatus(updated);
      setShowStatusModal(false);
    } catch {
      Alert.alert(t("common.error"), t("doctor.status.saveError"));
    } finally {
      setSavingStatus(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const [tmRaw, peersRaw] = await Promise.all([
        api<unknown>("/api/staff/conversations").catch(() => []),
        api<unknown>("/api/doctor/peer-conversations").catch(() => []),
      ]);
      const tm = Array.isArray(tmRaw)
        ? (tmRaw as Conversation[])
        : ((tmRaw as { conversations?: Conversation[] })?.conversations ?? []);
      const pr = Array.isArray(peersRaw) ? (peersRaw as Conversation[]) : [];
      setTeam(tm);
      setPeers(pr);
    } catch (e) {
      console.warn("messages load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const data = tab === "medecins" ? peers : team;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("doctor.messagerie.title")}</Text>
      </View>

      {/* Status banner — always visible. Shows current status or invite to set one. */}
      <Pressable style={styles.statusBanner} onPress={openStatusModal}>
        <Ionicons
          name="information-circle"
          size={15}
          color={docStatus?.isActive ? "#92400E" : colors.foregroundSecondary}
        />
        <Text style={styles.statusBannerText} numberOfLines={1}>
          {docStatus?.isActive && docStatus.statusMessage
            ? t("doctor.status.banner", { msg: docStatus.statusMessage })
            : t("doctor.status.noStatus")}
        </Text>
        <Text style={styles.statusBannerEdit}>{t("doctor.status.edit")}</Text>
      </Pressable>

      {/* Status edit modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("doctor.status.statusMessage")}</Text>
              <Pressable onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>{t("doctor.status.statusMessage")}</Text>
            <TextInput
              style={styles.modalInput}
              value={statusMsg}
              onChangeText={setStatusMsg}
              placeholder={t("doctor.status.statusMessage")}
              placeholderTextColor={colors.foregroundSecondary}
            />
            <Text style={styles.modalLabel}>{t("doctor.status.awayMessage")}</Text>
            <TextInput
              style={[styles.modalInput, { height: 72, textAlignVertical: "top" }]}
              value={awayMsg}
              onChangeText={setAwayMsg}
              placeholder={t("doctor.status.awayMessage")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
            />
            <Text style={styles.modalLabel}>{t("doctor.status.until")}</Text>
            <TextInput
              style={styles.modalInput}
              value={statusUntil}
              onChangeText={setStatusUntil}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.foregroundSecondary}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.danger, flex: 1 }]}
                onPress={clearStatus}
                disabled={savingStatus}
              >
                <Text style={styles.modalBtnText}>{t("doctor.status.clear")}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { flex: 2 }]} onPress={saveStatus} disabled={savingStatus}>
                {savingStatus
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnText}>{t("doctor.status.save")}</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.tabs}>
        <TabBtn
          icon="person"
          label={`${t("doctor.messagerie.doctors")}${peers.length ? ` · ${peers.length}` : ""}`}
          active={tab === "medecins"}
          onPress={() => setTab("medecins")}
        />
        <TabBtn
          icon="medkit"
          label={`${t("doctor.messagerie.team.title")}${team.length ? ` · ${team.length}` : ""}`}
          active={tab === "equipe"}
          onPress={() => setTab("equipe")}
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.teal}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.foregroundSecondary} />
              <Text style={styles.emptyText}>
                {tab === "medecins"
                  ? t("doctor.messagerie.noDoctors")
                  : t("doctor.messagerie.team.empty")}
              </Text>
            </View>
          }
          renderItem={({ item }) => <ConversationRow conversation={item} kind={tab} />}
        />
      )}
    </SafeAreaView>
  );
}

function TabBtn({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={14} color={active ? "#FFFFFF" : colors.foreground} />
      <Text style={[styles.tabBtnText, active && { color: "#FFFFFF" }]}>{label}</Text>
    </Pressable>
  );
}

function ConversationRow({ conversation, kind }: { conversation: Conversation; kind: Tab }) {
  const displayName = conversation.peerName ?? "Conversation";
  const unread = conversation.unreadCount ?? conversation.unread ?? 0;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const time = conversation.lastMessageAt
    ? new Date(conversation.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : null;
  const peerId = conversation.peerId ?? "";
  const chatKind = kind === "medecins" ? "peer" : "team";

  // Role badge for team tab — distinguishes secretary vs peer doctor
  const roleBadge =
    kind === "equipe"
      ? conversation.peerType === "secretary"
        ? t("doctor.messagerie.team.roleSecretary")
        : t("doctor.messagerie.team.roleDoctor")
      : null;

  const avatarBg = kind === "equipe" ? "#FEF3C7" : "#DBEAFE";
  const avatarFg = kind === "equipe" ? "#92400E" : "#1E40AF";

  function open() {
    router.push({
      pathname: "/(doctor)/chat/[id]" as never,
      params: {
        id: conversation.id,
        kind: chatKind,
        peerName: displayName,
        peerId,
        peerType: conversation.peerType ?? (kind === "medecins" ? "doctor" : "secretary"),
      },
    });
  }

  const lastMessageFallback =
    kind === "medecins"
      ? t("doctor.messagerie.peerColleague")
      : t("doctor.messagerie.team.openConversation");

  return (
    <Pressable style={styles.row} onPress={open}>
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={[styles.avatarText, { color: avatarFg }]}>{initials || "?"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <View style={styles.rowNameWrap}>
            <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
            {roleBadge && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleBadge}</Text>
              </View>
            )}
          </View>
          {time && <Text style={styles.rowTime}>{time}</Text>}
        </View>
        <Text style={styles.rowLast} numberOfLines={1}>
          {conversation.lastMessage ?? lastMessageFallback}
        </Text>
      </View>
      {unread > 0 && (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>{unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.xs, marginBottom: spacing.sm },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  tabBtnActive: { backgroundColor: colors.teal },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.teal, fontWeight: "800" },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowNameWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowName: { fontSize: 14, fontWeight: "700", color: colors.foreground, flexShrink: 1 },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: "#FEF3C7",
  },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: "#92400E" },
  rowTime: { fontSize: 11, color: colors.foregroundSecondary, marginLeft: spacing.xs },
  rowLast: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  empty: { padding: spacing["2xl"], alignItems: "center", gap: spacing.sm },
  emptyText: { color: colors.foregroundSecondary, fontSize: 13, textAlign: "center" },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: "#FEF3C7", paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    borderRadius: radii.md, borderWidth: 1, borderColor: "#FDE68A",
  },
  statusBannerText: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "600" },
  statusBannerEdit: { fontSize: 12, color: "#92400E", fontWeight: "800", textDecorationLine: "underline" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    padding: spacing.xl, gap: spacing.md, paddingBottom: spacing["3xl"],
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  modalLabel: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 14, color: colors.foreground, backgroundColor: colors.bgSecondary,
  },
  modalBtn: {
    backgroundColor: colors.teal, borderRadius: radii.md,
    paddingVertical: spacing.md, alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
