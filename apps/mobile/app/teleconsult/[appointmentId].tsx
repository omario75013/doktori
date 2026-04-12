import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, Animated, Easing } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video, Wifi, WifiOff, ArrowRight, RefreshCw } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function PulseRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 2, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
  );
}

export default function TeleconsultScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    apiFetch<{ roomUrl: string }>(`/api/teleconsult/${appointmentId}`)
      .then((data) => { setRoomUrl(data.roomUrl); setLoading(false); })
      .catch((e) => { setError(e.message || "Téléconsultation introuvable"); setLoading(false); });
  }, [appointmentId]);

  async function joinCall() {
    if (!roomUrl) return;
    setJoined(true);
    await WebBrowser.openBrowserAsync(roomUrl, {
      dismissButtonStyle: "close",
      toolbarColor: colors.primaryDark,
      controlsColor: colors.white,
    });
    Alert.alert(
      "Consultation terminée ?",
      "Votre téléconsultation est-elle terminée ?",
      [
        { text: "Non, reprendre", onPress: () => joinCall() },
        { text: "Oui, terminer", onPress: () => router.back() },
      ]
    );
  }

  if (loading) return <LoadingSpinner message="Connexion à la salle..." />;

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.errorCard, shadow.md]}>
          <View style={styles.errorIconWrap}>
            <WifiOff size={32} color={colors.red} />
          </View>
          <Text style={styles.errorTitle}>Connexion impossible</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retour" onPress={() => router.back()} variant="secondary" size="lg" style={{ width: "100%" }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, shadow.lg, { opacity: fadeIn }]}>
        {/* Animated icon */}
        <View style={styles.iconArea}>
          {!joined && <PulseRing />}
          <View style={[styles.iconCircle, joined && styles.iconCircleActive]}>
            <Video size={32} color={colors.white} strokeWidth={1.8} />
          </View>
        </View>

        <Text style={styles.title}>
          {joined ? "Consultation en cours" : "Téléconsultation"}
        </Text>
        <Text style={styles.subtitle}>
          {joined
            ? "La vidéo est ouverte dans votre navigateur. Revenez ici pour terminer."
            : "Votre médecin vous attend. La vidéo s'ouvrira dans le navigateur pour une meilleure qualité."}
        </Text>

        {/* Connection quality indicator */}
        <View style={styles.qualityRow}>
          <Wifi size={14} color={colors.green} />
          <Text style={styles.qualityText}>Connexion sécurisée</Text>
        </View>

        <Button
          title={joined ? "Rejoindre à nouveau" : "Lancer la vidéo"}
          onPress={joinCall}
          size="lg"
          icon={joined ? <RefreshCw size={18} color={colors.white} /> : <ArrowRight size={18} color={colors.white} />}
          style={{ width: "100%", backgroundColor: colors.purple }}
        />

        {joined && (
          <Button
            title="Terminer la consultation"
            onPress={() => router.back()}
            variant="ghost"
            size="md"
            style={{ marginTop: spacing.sm, width: "100%" }}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center", padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: "center",
    width: "100%", maxWidth: 400,
    borderWidth: 1, borderColor: colors.border,
  },
  iconArea: {
    width: 100, height: 100,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  pulseRing: {
    position: "absolute", width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: colors.purple,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 28,
    backgroundColor: colors.purple,
    alignItems: "center", justifyContent: "center",
  },
  iconCircleActive: { backgroundColor: colors.green },
  title: {
    fontSize: 24, fontWeight: "800", color: colors.ink,
    textAlign: "center", letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15, color: colors.slate500,
    textAlign: "center", lineHeight: 22,
    marginTop: spacing.sm, marginBottom: spacing.lg,
  },
  qualityRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.greenFaint,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full, marginBottom: spacing.lg,
  },
  qualityText: { fontSize: 13, fontWeight: "600", color: colors.greenDark },
  errorCard: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: "center",
    width: "100%", maxWidth: 400,
    borderWidth: 1, borderColor: colors.border,
  },
  errorIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.redFaint,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  errorTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  errorText: { fontSize: 15, color: colors.slate500, textAlign: "center", marginBottom: spacing.lg, lineHeight: 22 },
});
