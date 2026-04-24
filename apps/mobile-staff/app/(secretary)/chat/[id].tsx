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
import { colors, spacing, radii, api, getStoredToken } from "@doktori/mobile-core";

type StaffMessage = {
  id: string;
  conversationId: string;
  senderType: "doctor" | "secretary";
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type AnyMsg = {
  id: string;
  mine: boolean;
  text: string;
  createdAt: string;
};

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

function Bubble({ msg }: { msg: AnyMsg }) {
  const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View style={[styles.bubbleWrap, msg.mine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
      <View style={[styles.bubble, msg.mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, msg.mine && styles.bubbleTextMine]}>{msg.text}</Text>
        <Text style={[styles.bubbleTime, msg.mine && { color: "rgba(255,255,255,0.65)" }]}>{time}</Text>
      </View>
    </View>
  );
}

export default function SecretaryChatScreen() {
  const params = useLocalSearchParams<{
    id: string;
    peerName?: string;
    peerId?: string;
    peerType?: string;
  }>();
  const conversationId = params.id;
  const peerName = params.peerName ?? "Conversation";

  const [messages, setMessages] = useState<AnyMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const selfRef = useRef<{ id: string; type: "doctor" | "secretary" } | null>(null);
  const listRef = useRef<FlatList<AnyMsg>>(null);

  const load = useCallback(async () => {
    try {
      if (!selfRef.current) {
        const token = await getStoredToken();
        if (token) {
          const payload = decodeJwt(token);
          if (payload && typeof payload.id === "string" &&
              (payload.role === "doctor" || payload.role === "secretary")) {
            selfRef.current = { id: payload.id, type: payload.role };
          }
        }
      }
      const raw = await api<StaffMessage[]>(
        `/api/staff/conversations/${conversationId}/messages`,
        { noRedirect: true }
      );
      const self = selfRef.current;
      setMessages(raw.map((m) => ({
        id: m.id,
        mine: !!self && m.senderType === self.type && m.senderId === self.id,
        text: m.body,
        createdAt: m.createdAt,
      })));
    } catch { /* silent poll */ }
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const tempId = `opt-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, mine: true, text: content, createdAt: new Date().toISOString() }]);
    setText("");
    try {
      await api(`/api/staff/conversations/${conversationId}/messages`, {
        method: "POST",
        body: { body: content },
        noRedirect: true,
      });
      await load();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  function startCall() {
    router.push({
      pathname: "/(secretary)/call/[id]" as never,
      params: {
        id: "new",
        peerName,
        peerId: params.peerId ?? "",
        peerType: params.peerType ?? "doctor",
        role: "caller",
        conversationId,
      },
    });
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.navigate("/(secretary)/messages" as never)}
          hitSlop={10}
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{peerName}</Text>
        <Pressable onPress={startCall} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="call" size={22} color={colors.teal} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
                <Ionicons name="chatbubbles-outline" size={32} color={colors.foregroundSecondary} />
                <Text style={styles.emptyText}>Aucun message encore. Envoyez le premier.</Text>
              </View>
            }
            renderItem={({ item }) => <Bubble msg={item} />}
          />
        )}

        <View style={styles.composer}>
          <Pressable
            onPress={() => Alert.alert("Pièces jointes", "L'envoi de fichiers arrive bientôt.")}
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
            style={[styles.sendBtn, (!text.trim() || sending) && { backgroundColor: colors.border }]}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="send" size={18} color="#FFF" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.foreground },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, gap: spacing.xs, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingTop: spacing["3xl"] },
  emptyText: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
  bubbleWrap: { marginVertical: 2 },
  bubbleWrapMine: { alignItems: "flex-end" },
  bubbleWrapOther: { alignItems: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  bubbleMine: { backgroundColor: colors.tealDark, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bgSecondary, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: colors.foreground },
  bubbleTextMine: { color: "#FFF" },
  bubbleTime: { fontSize: 11, color: colors.foregroundSecondary, alignSelf: "flex-end" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  attachBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.foreground,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.tealDark,
    alignItems: "center",
    justifyContent: "center",
  },
});
