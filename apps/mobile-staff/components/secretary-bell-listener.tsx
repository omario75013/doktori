import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api, colors, spacing, radii } from "@doktori/mobile-core";

const isExpoGo = Constants.executionEnvironment === "storeClient";

type Bell = {
  id: string;
  label: string;
  message: string | null;
  icon: string | null;
  createdAt: string;
};

const QUICK_REPLIES = [
  "J'arrive tout de suite",
  "J'arrive dans 2 minutes",
  "Je suis avec un patient, j'arrive",
  "Noté, merci",
  "Vu — j'arrive",
];

async function scheduleLocalBell(bell: Bell) {
  if (isExpoGo) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 ${bell.label}`,
        body: bell.message ?? "Le médecin vous sollicite",
        sound: "default",
        data: { type: "bell", bellId: bell.id },
        ...(Platform.OS === "android" ? { channelId: "bells" } : {}),
      },
      trigger: null,
    });
  } catch {
    /* ignore if notifications not granted */
  }
}

export function SecretaryBellListener() {
  const [bell, setBell] = useState<Bell | null>(null);
  const [acking, setAcking] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const seenRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const rows = await api<Bell[]>("/api/staff/bells/pending", { noRedirect: true });
      if (!Array.isArray(rows) || rows.length === 0) return;
      const next = rows.find((b) => !seenRef.current.has(b.id));
      if (!next) return;
      seenRef.current.add(next.id);
      setBell(next);
      setAcking(false);
      setCustomMode(false);
      setCustomText("");
      // Schedule a system notification so the sound plays even in foreground
      await scheduleLocalBell(next);
    } catch {
      /* silent — no auth or network error */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(poll, 5000);
    void poll();
    return () => clearInterval(id);
  }, [poll]);

  async function acknowledge(message: string | null) {
    if (!bell || acking) return;
    setAcking(true);
    try {
      await api(`/api/staff/bells/${bell.id}/ack`, {
        method: "POST",
        body: { message },
        noRedirect: true,
      });
    } catch { /* ignore */ } finally {
      setBell(null);
      setAcking(false);
    }
  }

  if (!bell) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => acknowledge(null)}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Bell icon */}
          <View style={s.iconWrap}>
            <Ionicons name="notifications" size={32} color="#FFF" />
          </View>

          <Text style={s.label}>{bell.label}</Text>
          {bell.message ? (
            <Text style={s.message}>{bell.message}</Text>
          ) : null}
          <Text style={s.time}>
            Du médecin · {new Date(bell.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </Text>

          {customMode ? (
            <View style={s.customWrap}>
              <TextInput
                style={s.customInput}
                value={customText}
                onChangeText={setCustomText}
                placeholder="Votre réponse…"
                placeholderTextColor={colors.foregroundSecondary}
                multiline
                autoFocus
              />
              <View style={s.customActions}>
                <Pressable
                  style={[s.btn, s.btnSecondary]}
                  onPress={() => setCustomMode(false)}
                >
                  <Text style={s.btnSecondaryText}>Retour</Text>
                </Pressable>
                <Pressable
                  style={[s.btn, s.btnPrimary, acking && { opacity: 0.6 }]}
                  onPress={() => acknowledge(customText.trim() || null)}
                  disabled={acking}
                >
                  {acking
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={s.btnPrimaryText}>Envoyer</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={s.repliesWrap}>
              {QUICK_REPLIES.map((r) => (
                <Pressable
                  key={r}
                  style={({ pressed }) => [s.replyBtn, pressed && { opacity: 0.7 }, acking && { opacity: 0.5 }]}
                  onPress={() => acknowledge(r)}
                  disabled={acking}
                >
                  <Ionicons name="checkmark" size={14} color={colors.teal} />
                  <Text style={s.replyText}>{r}</Text>
                </Pressable>
              ))}
              <Pressable
                style={s.customLink}
                onPress={() => setCustomMode(true)}
                disabled={acking}
              >
                <Text style={s.customLinkText}>Écrire une réponse personnalisée…</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.teal,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  time: {
    fontSize: 11,
    color: colors.border,
    marginBottom: spacing.sm,
  },
  repliesWrap: {
    width: "100%",
    gap: spacing.xs,
  },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  replyText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
    flex: 1,
  },
  customLink: {
    marginTop: spacing.xs,
    alignSelf: "center",
  },
  customLinkText: {
    fontSize: 12,
    color: colors.teal,
  },
  customWrap: {
    width: "100%",
    gap: spacing.sm,
  },
  customInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    minHeight: 72,
    textAlignVertical: "top",
  },
  customActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: colors.teal,
  },
  btnPrimaryText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    color: colors.foreground,
    fontWeight: "600",
    fontSize: 14,
  },
});
