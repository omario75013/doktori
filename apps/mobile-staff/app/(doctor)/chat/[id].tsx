import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

type DoctorStatus = {
  statusMessage: string | null;
  awayMessage: string | null;
  statusActiveUntil: string | null;
  isActive: boolean;
};

type Kind = "patient" | "team" | "peer";

type PatientMessage = {
  id: string;
  conversationId: string;
  senderType: "doctor" | "patient";
  senderId: string;
  content: string;
  fileUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type StaffMessage = {
  id: string;
  conversationId: string;
  senderType: "doctor" | "secretary";
  senderId: string;
  body: string;
  createdAt: string;
};

type AnyMsg = {
  id: string;
  mine: boolean;
  text: string;
  createdAt: string;
  fileUrl?: string | null;
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    id: string;
    kind: string;
    peerName?: string;
    peerId?: string;
    peerType?: string;
  }>();
  const kind: Kind =
    params.kind === "team" ? "team" : params.kind === "peer" ? "peer" : "patient";
  const conversationId = params.id;
  const { locale } = useLocale();
  const peerName = params.peerName || "Conversation";

  const [messages, setMessages] = useState<AnyMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const listRef = useRef<FlatList<AnyMsg>>(null);
  const [docStatus, setDocStatus] = useState<DoctorStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [awayMsg, setAwayMsg] = useState("");
  const [statusUntil, setStatusUntil] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api<{ id: string }>("/api/doctor/me").catch(() => null);
      if (me) setSelfId(me.id);

      if (kind === "peer") {
        const raw = await api<StaffMessage[]>(
          `/api/doctor/peer-conversations/${conversationId}/messages`
        );
        const list: AnyMsg[] = raw.map((m) => ({
          id: m.id,
          mine: !!me && m.senderId === me.id,
          text: m.body,
          createdAt: m.createdAt,
        }));
        setMessages(list);
      } else if (kind === "patient") {
        const raw = await api<PatientMessage[]>(
          `/api/doctor/conversations/${conversationId}/messages`
        );
        const list: AnyMsg[] = raw.map((m) => ({
          id: m.id,
          mine: m.senderType === "doctor",
          text: m.content,
          createdAt: m.createdAt,
          fileUrl: m.fileUrl,
        }));
        setMessages(list);
      } else {
        const raw = await api<StaffMessage[]>(
          `/api/staff/conversations/${conversationId}/messages`
        );
        const list: AnyMsg[] = raw.map((m) => ({
          id: m.id,
          mine: !!me && m.senderId === me.id,
          text: m.body,
          createdAt: m.createdAt,
        }));
        setMessages(list);
      }
    } catch (e) {
      console.warn("load chat failed", e);
    } finally {
      setLoading(false);
    }
  }, [conversationId, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<DoctorStatus>("/api/doctor/status", { noRedirect: true })
      .then(setDocStatus)
      .catch(() => null);
  }, []);

  // Light polling for new messages every 4 s while the screen is open.
  useEffect(() => {
    const t = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    // Optimistic
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        mine: true,
        text: body,
        createdAt: new Date().toISOString(),
      },
    ]);
    setText("");
    try {
      if (kind === "peer") {
        await api(`/api/doctor/peer-conversations/${conversationId}/messages`, {
          method: "POST",
          body: { body },
        });
      } else if (kind === "patient") {
        const patientId = params.peerId;
        if (!patientId) throw new Error("patientId manquant");
        await api("/api/doctor/messages", {
          method: "POST",
          body: { patientId, content: body },
        });
      } else {
        await api(`/api/staff/conversations/${conversationId}/messages`, {
          method: "POST",
          body: { body },
        });
      }
      await load();
    } catch (e) {
      // Rollback optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("doctor.chat.sendError"));
    } finally {
      setSending(false);
    }
  }

  function startCall() {
    const peerTypeTarget =
      kind === "peer" ? "doctor" : kind === "team" ? (params.peerType ?? "secretary") : "patient";
    router.push({
      pathname: "/(doctor)/call/[id]" as never,
      params: {
        id: "new",
        peerName,
        peerId: params.peerId ?? "",
        peerType: peerTypeTarget,
        role: "caller",
        conversationId,
        conversationKind: kind,
      },
    });
  }

  function goBack() {
    router.navigate("/(doctor)/messagerie" as never);
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

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Custom header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
        <Pressable
          onPress={() => {
            setStatusMsg(docStatus?.statusMessage ?? "");
            setAwayMsg(docStatus?.awayMessage ?? "");
            setStatusUntil(docStatus?.statusActiveUntil?.slice(0, 10) ?? "");
            setShowStatusModal(true);
          }}
          hitSlop={10}
          style={styles.headerBtn}
        >
          <Ionicons name="radio-button-on" size={20} color={docStatus?.isActive ? "#F59E0B" : colors.foregroundSecondary} />
        </Pressable>
        <Pressable onPress={startCall} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="call" size={22} color={colors.teal} />
        </Pressable>
      </View>

      {/* Status banner */}
      {docStatus?.isActive && docStatus.statusMessage ? (
        <Pressable
          style={styles.statusBanner}
          onPress={() => {
            setStatusMsg(docStatus.statusMessage ?? "");
            setAwayMsg(docStatus.awayMessage ?? "");
            setStatusUntil(docStatus.statusActiveUntil?.slice(0, 10) ?? "");
            setShowStatusModal(true);
          }}
        >
          <Ionicons name="information-circle" size={15} color="#92400E" />
          <Text style={styles.statusBannerText} numberOfLines={1}>
            {t("doctor.status.banner").replace("{msg}", docStatus.statusMessage)}
          </Text>
          <Ionicons name="chevron-forward" size={13} color="#92400E" />
        </Pressable>
      ) : null}

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
              keyboardType="numeric"
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.danger, flex: 1 }]} onPress={clearStatus} disabled={savingStatus}>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color={colors.foregroundSecondary}
                />
                <Text style={styles.emptyText}>
                  {t("doctor.chat.noMessages")}
                </Text>
              </View>
            }
            renderItem={({ item }) => <Bubble msg={item} />}
          />
        )}

        <View style={styles.composer}>
          <Pressable
            onPress={() =>
              Alert.alert(
                t("doctor.chat.attachmentTitle"),
                t("doctor.chat.attachmentDesc")
              )
            }
            style={styles.attachBtn}
          >
            <Ionicons name="attach" size={20} color={colors.foregroundSecondary} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("doctor.chat.placeholder")}
            placeholderTextColor={colors.foregroundSecondary}
            multiline
            style={styles.input}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            style={[
              styles.sendBtn,
              (!text.trim() || sending) && { backgroundColor: colors.border },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ msg }: { msg: AnyMsg }) {
  const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View
      style={[
        styles.bubbleWrap,
        msg.mine ? styles.bubbleWrapMine : styles.bubbleWrapOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          msg.mine ? styles.bubbleMine : styles.bubbleOther,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            msg.mine && { color: "#FFFFFF" },
          ]}
        >
          {msg.text}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            msg.mine && { color: "rgba(255,255,255,0.7)" },
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: "#FEF3C7", paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: "#FDE68A",
  },
  statusBannerText: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "600" },
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
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.md, gap: spacing.xs, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing["2xl"],
  },
  emptyText: { color: colors.foregroundSecondary, fontSize: 13 },

  bubbleWrap: { marginVertical: 2, maxWidth: "80%" },
  bubbleWrapMine: { alignSelf: "flex-end" },
  bubbleWrapOther: { alignSelf: "flex-start" },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: colors.teal,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.bgSecondary,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 19,
  },
  bubbleTime: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    alignSelf: "flex-end",
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: colors.foreground,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal,
  },
});
