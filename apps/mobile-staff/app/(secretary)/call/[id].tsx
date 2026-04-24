import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  callAction,
  createCall,
  colors,
  fetchCallStatus,
  radii,
  spacing,
} from "@doktori/mobile-core";
import type { CallSession } from "@doktori/mobile-core";

type Phase = "ringing" | "incoming" | "connected";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function formatDuration(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function PulsingRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.35, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.15, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, scale]);

  return (
    <View style={styles.avatarWrapper}>
      <Animated.View style={[styles.pulse, { transform: [{ scale }], opacity }]} />
      <View style={styles.avatarCircle} />
    </View>
  );
}

function AvatarCircle({ label }: { label: string }) {
  return (
    <View style={styles.avatarWrapper}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitials}>{label}</Text>
      </View>
    </View>
  );
}

type ActionBtnProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color?: string;
  active?: boolean;
  onPress: () => void;
};

function ActionBtn({ icon, label, color, active, onPress }: ActionBtnProps) {
  const bg = color ?? (active ? colors.teal : colors.bgSecondary);
  return (
    <Pressable style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={26} color="#FFFFFF" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

export default function SecretaryCallScreen() {
  const params = useLocalSearchParams<{
    id: string;
    peerName: string;
    role: string;
    peerId?: string;
    peerType?: string;
    conversationId?: string;
  }>();

  const [sessionId, setSessionId] = useState<string>(params.id !== "new" ? params.id : "");
  const peerName = params.peerName ?? "Inconnu";
  const role = params.role === "callee" ? "callee" : "caller";

  function returnToConversation() {
    if (params.conversationId) {
      router.replace({
        pathname: "/(secretary)/chat/[id]" as never,
        params: {
          id: params.conversationId,
          peerName,
          peerId: params.peerId ?? "",
          peerType: params.peerType ?? "doctor",
        },
      });
    } else {
      router.navigate("/(secretary)/messages" as never);
    }
  }

  const [phase, setPhase] = useState<Phase>(role === "callee" ? "incoming" : "ringing");
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startPolling() {
    pollingRef.current = setInterval(async () => {
      try {
        const session: CallSession = await fetchCallStatus(sessionId);
        handleStatusUpdate(session.status);
      } catch { /* ignore transient errors */ }
    }, 2000);
  }

  function stopPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }

  function handleStatusUpdate(status: CallSession["status"]) {
    if (status === "accepted") {
      if (phase !== "connected") { setPhase("connected"); startTimer(); }
    } else if (status === "declined") {
      stopPolling(); stopTimer();
      Alert.alert("Appel refusé", undefined, [{ text: "OK", onPress: returnToConversation }]);
    } else if (status === "ended") {
      stopPolling(); stopTimer();
      Alert.alert("Appel terminé", undefined, [{ text: "OK", onPress: returnToConversation }]);
    }
  }

  useEffect(() => {
    if (params.id === "new" && role === "caller") {
      const peerId = params.peerId ?? "";
      const peerType = (params.peerType ?? "doctor") as "doctor" | "secretary";
      if (!peerId) {
        Alert.alert("Erreur", "Destinataire manquant");
        returnToConversation();
        return;
      }
      createCall(peerType, peerId)
        .then((session) => setSessionId(session.id))
        .catch(() => { Alert.alert("Erreur", "Impossible de lancer l'appel"); returnToConversation(); });
    } else {
      startPolling();
    }
    return () => { stopPolling(); stopTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionId && params.id === "new") startPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleAnswer() {
    try {
      await callAction(sessionId, "accept");
      setPhase("connected");
      startTimer();
    } catch {
      Alert.alert("Erreur", "Impossible de décrocher. Réessayez.");
    }
  }

  async function handleDecline() {
    try { await callAction(sessionId, "decline"); } catch { /* best-effort */ }
    stopPolling();
    returnToConversation();
  }

  async function handleHangUp() {
    stopPolling(); stopTimer();
    try { await callAction(sessionId, "end"); } catch { /* best-effort */ }
    returnToConversation();
  }

  const peerInitials = initials(peerName);

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topSection}>
        {phase === "ringing" && (
          <>
            <Text style={styles.statusLabel}>Appel en cours...</Text>
            <Text style={styles.peerName}>{peerName}</Text>
            <PulsingRing />
          </>
        )}
        {phase === "incoming" && (
          <>
            <Text style={styles.statusLabel}>Appel entrant</Text>
            <Text style={styles.peerName}>{peerName}</Text>
            <AvatarCircle label={peerInitials} />
          </>
        )}
        {phase === "connected" && (
          <>
            <Text style={styles.statusLabel}>Appel connecté</Text>
            <Text style={styles.peerName}>{peerName}</Text>
            <AvatarCircle label={peerInitials} />
            <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
          </>
        )}
      </View>

      <View style={styles.bottomSection}>
        {phase === "ringing" && (
          <ActionBtn icon="call" label="Raccrocher" color={colors.danger} onPress={handleHangUp} />
        )}
        {phase === "incoming" && (
          <View style={styles.incomingRow}>
            <ActionBtn icon="call" label="Décrocher" color={colors.green} onPress={handleAnswer} />
            <ActionBtn icon="call" label="Refuser" color={colors.danger} onPress={handleDecline} />
          </View>
        )}
        {phase === "connected" && (
          <View style={styles.connectedRow}>
            <ActionBtn icon={muted ? "mic-off" : "mic"} label={muted ? "Muet" : "Micro"} active={muted} onPress={() => setMuted((v) => !v)} />
            <ActionBtn icon={speakerOn ? "volume-high" : "volume-medium"} label="Haut-parleur" active={speakerOn} onPress={() => setSpeakerOn((v) => !v)} />
            <ActionBtn icon="call" label="Raccrocher" color={colors.danger} onPress={handleHangUp} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 120;
const PULSE_SIZE = AVATAR_SIZE + 48;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A", justifyContent: "space-between" },
  topSection: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingTop: spacing["2xl"] },
  statusLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.8 },
  peerName: { fontSize: 26, fontWeight: "800", color: "#F8FAFC", textAlign: "center", paddingHorizontal: spacing.xl },
  timer: { fontSize: 22, fontWeight: "700", color: colors.tealLight, fontFamily: "monospace", marginTop: spacing.sm },
  avatarWrapper: { width: PULSE_SIZE, height: PULSE_SIZE, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  pulse: { position: "absolute", width: PULSE_SIZE, height: PULSE_SIZE, borderRadius: PULSE_SIZE / 2, backgroundColor: colors.teal },
  avatarCircle: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 38, fontWeight: "800", color: "#FFFFFF" },
  bottomSection: { paddingBottom: spacing["3xl"], paddingHorizontal: spacing.xl, alignItems: "center" },
  incomingRow: { flexDirection: "row", gap: spacing["2xl"], justifyContent: "center" },
  connectedRow: { flexDirection: "row", gap: spacing.xl, justifyContent: "center", alignItems: "flex-start" },
  actionBtn: { alignItems: "center", gap: spacing.xs },
  actionCircle: { width: 68, height: 68, borderRadius: radii.full, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
});
