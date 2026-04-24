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
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Message = {
  id: string;
  conversationId: string;
  senderType: "doctor" | "patient";
  senderId: string;
  content: string;
  fileUrl: string | null;
  createdAt: string;
};

type AnyMsg = {
  id: string;
  mine: boolean;
  text: string;
  createdAt: string;
};

async function getPatientToken(): Promise<string | null> {
  const SecureStore = await import("expo-secure-store").catch(() => null);
  return SecureStore ? SecureStore.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientChatScreen() {
  const params = useLocalSearchParams<{ id: string; doctorName?: string }>();
  const conversationId = params.id;
  const doctorName = params.doctorName ?? "Médecin";

  const [messages, setMessages] = useState<AnyMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const listRef = useRef<FlatList<AnyMsg>>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getPatientToken();
      const raw = await api<Message[]>(`/api/conversations/${conversationId}/messages`, { token: token ?? undefined });
      setMessages(raw.map((m) => ({
        id: m.id,
        mine: m.senderType === "patient",
        text: m.content,
        createdAt: m.createdAt,
      })));
    } catch {
      // silent poll fail
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: AnyMsg = { id: optimisticId, mine: true, text: content, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const token = await getPatientToken();
      await api(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        token: token ?? undefined,
        body: { content },
      });
      await load();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setText(content);
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.navigate("/(patient)/messages" as never)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{doctorName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.mine ? styles.bubbleMine : styles.bubblePeer]}>
                <Text style={[styles.bubbleText, item.mine && styles.bubbleTextMine]}>
                  {item.text}
                </Text>
                <Text style={[styles.bubbleTime, item.mine && { color: "rgba(255,255,255,0.7)" }]}>
                  {new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            )}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Votre message…"
            placeholderTextColor={colors.foregroundSecondary}
            multiline
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable
            style={({ pressed }) => [styles.sendBtn, (!text.trim() || pressed) && { opacity: 0.5 }]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" size={16} />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  listContent: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  bubble: {
    maxWidth: "78%",
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 3,
  },
  bubbleMine: {
    backgroundColor: colors.teal,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubblePeer: {
    backgroundColor: colors.bgSecondary,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, color: colors.foreground },
  bubbleTextMine: { color: "#FFF" },
  bubbleTime: { fontSize: 11, color: colors.foregroundSecondary, alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
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
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
});
