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
  t,
} from "@doktori/mobile-core";
import type { CallSession } from "@doktori/mobile-core";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "ringing" | "incoming" | "connected";

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatDuration(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ── Pulsing ring animation ─────────────────────────────────────────────────

function PulsingRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.35,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.15,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 900,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, scale]);

  return (
    <View style={styles.avatarWrapper}>
      <Animated.View
        style={[styles.pulse, { transform: [{ scale }], opacity }]}
      />
      <View style={styles.avatarCircle} />
    </View>
  );
}

// ── Avatar circle (connected state) ────────────────────────────────────────

function AvatarCircle({ label }: { label: string }) {
  return (
    <View style={styles.avatarWrapper}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitials}>{label}</Text>
      </View>
    </View>
  );
}

// ── Action button ──────────────────────────────────────────────────────────

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

// ── Main screen ───────────────────────────────────────────────────────────

export default function CallScreen() {
  const params = useLocalSearchParams<{
    id: string;
    peerName: string;
    role: string;
    peerId?: string;
    peerType?: string;
    conversationId?: string;
    conversationKind?: string;
  }>();

  const [sessionId, setSessionId] = useState<string>(
    params.id !== "new" ? params.id : ""
  );
  const peerName = params.peerName ?? "Inconnu";
  const role = params.role === "callee" ? "callee" : "caller";

  function returnToConversation() {
    if (params.conversationId) {
      router.replace({
        pathname: "/(doctor)/chat/[id]" as never,
        params: {
          id: params.conversationId,
          kind: params.conversationKind ?? "team",
          peerName,
          peerId: params.peerId ?? "",
          peerType: params.peerType ?? "doctor",
        },
      });
    } else {
      router.navigate("/(doctor)/messagerie" as never);
    }
  }

  const [phase, setPhase] = useState<Phase>(
    role === "callee" ? "incoming" : "ringing"
  );
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start / stop the connected timer ────────────────────────────────────

  function startTimer() {
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── Poll call status ─────────────────────────────────────────────────────

  function startPolling() {
    pollingRef.current = setInterval(async () => {
      try {
        const session: CallSession = await fetchCallStatus(sessionId);
        handleStatusUpdate(session.status);
      } catch {
        // Silently ignore transient network errors during polling
      }
    }, 2000);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function handleStatusUpdate(
    status: CallSession["status"]
  ) {
    if (status === "accepted") {
      if (phase !== "connected") {
        setPhase("connected");
        startTimer();
      }
    } else if (status === "declined") {
      stopPolling();
      stopTimer();
      Alert.alert(t("doctor.call.callRefused"), undefined, [
        { text: t("common.ok"), onPress: returnToConversation },
      ]);
    } else if (status === "ended") {
      stopPolling();
      stopTimer();
      Alert.alert(t("doctor.call.callEnded"), undefined, [
        { text: t("common.ok"), onPress: returnToConversation },
      ]);
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (params.id === "new" && role === "caller") {
      // Create the call session first, then start polling
      const peerId = params.peerId ?? "";
      const peerType = (params.peerType ?? "doctor") as "doctor" | "secretary";
      if (!peerId) { Alert.alert(t("common.error"), t("doctor.call.missingRecipient")); returnToConversation(); return; }
      createCall(peerType, peerId)
        .then((session) => {
          setSessionId(session.id);
        })
        .catch(() => {
          Alert.alert(t("common.error"), t("doctor.call.cannotStart"));
          returnToConversation();
        });
    } else {
      startPolling();
    }
    return () => {
      stopPolling();
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start polling once we have a session ID (handles the "new" creation case)
  useEffect(() => {
    if (sessionId && params.id === "new") {
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Callee actions ───────────────────────────────────────────────────────

  async function handleAnswer() {
    try {
      await callAction(sessionId, "accept");
      setPhase("connected");
      startTimer();
    } catch {
      Alert.alert(t("common.error"), t("doctor.call.cannotAnswer"));
    }
  }

  async function handleDecline() {
    try {
      await callAction(sessionId, "decline");
    } catch {
      // Best-effort: navigate back regardless
    }
    stopPolling();
    returnToConversation();
  }

  // ── Hang up (both roles) ─────────────────────────────────────────────────

  async function handleHangUp() {
    stopPolling();
    stopTimer();
    try {
      await callAction(sessionId, "end");
    } catch {
      // Best-effort
    }
    returnToConversation();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const peerInitials = initials(peerName);

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topSection}>
        {phase === "ringing" && (
          <>
            <Text style={styles.statusLabel}>{t("doctor.call.inProgress")}</Text>
            <Text style={styles.peerName}>{peerName}</Text>
            <PulsingRing />
          </>
        )}

        {phase === "incoming" && (
          <>
            <Text style={styles.statusLabel}>{t("doctor.call.incoming")}</Text>
            <Text style={styles.peerName}>{peerName}</Text>
            <AvatarCircle label={peerInitials} />
          </>
        )}

        {phase === "connected" && (
          <>
            <Text style={styles.statusLabel}>{t("doctor.call.connected")}</Text>
            <Text style={styles.peerName}>{peerName}</Text>
            <AvatarCircle label={peerInitials} />
            <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
          </>
        )}
      </View>

      <View style={styles.bottomSection}>
        {phase === "ringing" && (
          <ActionBtn
            icon="call"
            label={t("doctor.call.hangup")}
            color={colors.danger}
            onPress={handleHangUp}
          />
        )}

        {phase === "incoming" && (
          <View style={styles.incomingRow}>
            <ActionBtn
              icon="call"
              label={t("doctor.call.answer")}
              color={colors.green}
              onPress={handleAnswer}
            />
            <ActionBtn
              icon="call"
              label={t("doctor.call.reject")}
              color={colors.danger}
              onPress={handleDecline}
            />
          </View>
        )}

        {phase === "connected" && (
          <View style={styles.connectedRow}>
            <ActionBtn
              icon={muted ? "mic-off" : "mic"}
              label={muted ? t("doctor.call.mute") : t("doctor.call.unmute")}
              active={muted}
              onPress={() => setMuted((v) => !v)}
            />
            <ActionBtn
              icon={speakerOn ? "volume-high" : "volume-medium"}
              label={t("doctor.call.speaker")}
              active={speakerOn}
              onPress={() => setSpeakerOn((v) => !v)}
            />
            <ActionBtn
              icon="call"
              label={t("doctor.call.hangup")}
              color={colors.danger}
              onPress={handleHangUp}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 120;
const PULSE_SIZE = AVATAR_SIZE + 48;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "space-between",
  },

  // ── Top section
  topSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingTop: spacing["2xl"],
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  peerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F8FAFC",
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  timer: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.tealLight,
    fontFamily: "monospace",
    marginTop: spacing.sm,
  },

  // ── Avatar / pulse
  avatarWrapper: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  pulse: {
    position: "absolute",
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    backgroundColor: colors.teal,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // ── Bottom section
  bottomSection: {
    paddingBottom: spacing["3xl"],
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },

  incomingRow: {
    flexDirection: "row",
    gap: spacing["2xl"],
    justifyContent: "center",
  },
  connectedRow: {
    flexDirection: "row",
    gap: spacing.xl,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  // ── Action buttons
  actionBtn: {
    alignItems: "center",
    gap: spacing.xs,
  },
  actionCircle: {
    width: 68,
    height: 68,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
});
