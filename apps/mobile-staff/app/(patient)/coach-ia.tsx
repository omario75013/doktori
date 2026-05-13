import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Msg = { id: string; role: "user" | "assistant"; content: string };

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STUB_RESPONSE = "Cette fonctionnalité arrive bientôt";

export default function PatientCoachIa() {
  useLocale();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "intro",
      role: "assistant",
      content: t("patient.coachIa.intro"),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/plus-menu" as never);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  const SUGGESTIONS = [
    t("patient.coachIa.suggestionHeadache"),
    t("patient.coachIa.suggestionFever"),
    t("patient.coachIa.suggestionStress"),
  ];

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      const userMsg: Msg = { id: uid(), role: "user", content };
      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      setInput("");
      setSending(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

      let reply = STUB_RESPONSE;
      try {
        const token = await getPatientToken();
        // Coach-IA web route is SSE streaming. We attempt a simple POST and
        // fall back to the stub if streaming/feature is unavailable.
        const payload = nextHistory
          .filter((m) => m.id !== "intro")
          .map((m) => ({ role: m.role, content: m.content }));
        const res = await api<{ text?: string; error?: string }>("/api/coach-ia", {
          method: "POST",
          token: token ?? undefined,
          body: { messages: payload },
        }).catch(() => null);
        if (res && typeof res.text === "string" && res.text.length > 0) {
          reply = res.text;
        }
      } catch {
        // keep stub
      }

      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: reply }]);
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    },
    [messages, sending],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(patient)/plus-menu" as never)} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{t("patient.coachIa.title")}</Text>
          <Text style={styles.subtitle}>{t("patient.coachIa.subtitle")}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
        {SUGGESTIONS.map((s) => (
          <Pressable key={s} style={styles.suggestChip} onPress={() => send(s)} disabled={sending}>
            <Ionicons name="sparkles" size={12} color={colors.teal} />
            <Text style={styles.suggestText}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.bubbleUser : styles.bubbleAi,
              ]}
            >
              {item.role === "assistant" && (
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={11} color={colors.teal} />
                  <Text style={styles.aiBadgeText}>{t("patient.coachIa.ai")}</Text>
                </View>
              )}
              <Text style={[styles.bubbleText, item.role === "user" && styles.bubbleTextUser]}>
                {item.content}
              </Text>
            </View>
          )}
          ListFooterComponent={
            sending ? (
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ActivityIndicator color={colors.teal} />
              </View>
            ) : null
          }
        />

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.foregroundSecondary} />
          <Text style={styles.disclaimerText}>{t("patient.coachIa.disclaimer")}</Text>
        </View>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("patient.coachIa.placeholder")}
            placeholderTextColor={colors.foregroundSecondary}
            style={styles.input}
            multiline
            editable={!sending}
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={sending || !input.trim()}
            style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
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
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  subtitle: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  suggestRow: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  suggestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  suggestText: { fontSize: 12, color: colors.foreground },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  bubble: {
    maxWidth: "85%",
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.xs,
  },
  bubbleUser: {
    backgroundColor: colors.teal,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: colors.bgSecondary,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  aiBadgeText: { fontSize: 10, fontWeight: "700", color: colors.teal, textTransform: "uppercase" },
  bubbleText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  bubbleTextUser: { color: "#FFFFFF" },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  disclaimerText: { fontSize: 11, color: colors.foregroundSecondary, flex: 1 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
