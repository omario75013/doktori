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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

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
  const peerName = params.peerName || "Conversation";

  const [messages, setMessages] = useState<AnyMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const listRef = useRef<FlatList<AnyMsg>>(null);

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
      Alert.alert("Erreur", e instanceof Error ? e.message : "Envoi échoué");
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

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Custom header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
        <Pressable onPress={startCall} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="call" size={22} color={colors.teal} />
        </Pressable>
      </View>
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
                  Aucun message encore. Envoyez le premier.
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
                "Envoi de fichiers",
                "L'envoi d'images et documents arrive bientôt sur mobile."
              )
            }
            style={styles.attachBtn}
          >
            <Ionicons name="attach" size={20} color={colors.foregroundSecondary} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
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
