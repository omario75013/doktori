// apps/mobile/app/teleconsult/[appointmentId].tsx
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

const PURPLE = "#7C3AED";

function LoadingView() {
  return (
    <View style={styles.center}>
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );
}

function ErrorView({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
      <Button title="Retour" onPress={onBack} variant="secondary" style={{ marginTop: spacing.md }} />
    </View>
  );
}

export default function TeleconsultScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    apiFetch<{ roomUrl: string }>(`/api/teleconsult/${appointmentId}`)
      .then((data) => {
        setRoomUrl(data.roomUrl);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Téléconsultation introuvable");
        setLoading(false);
      });
  }, [appointmentId]);

  async function joinCall() {
    if (!roomUrl) return;
    setJoined(true);
    await WebBrowser.openBrowserAsync(roomUrl, {
      dismissButtonStyle: "close",
      toolbarColor: "#1F2937",
      controlsColor: colors.primary,
    });
    // User returned from browser
    Alert.alert(
      "Consultation terminée ?",
      "Votre téléconsultation est-elle terminée ?",
      [
        { text: "Non, reprendre", onPress: () => joinCall() },
        { text: "Oui, terminer", onPress: () => router.back() },
      ]
    );
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onBack={() => router.back()} />;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.videoIcon}>📹</Text>
        </View>
        <Text style={styles.title}>Téléconsultation</Text>
        <Text style={styles.subtitle}>
          {joined
            ? "La consultation est ouverte dans votre navigateur"
            : "Prêt à rejoindre votre consultation vidéo"}
        </Text>
        <Button
          title={joined ? "Rejoindre à nouveau" : "Lancer la vidéo"}
          onPress={joinCall}
          style={{ backgroundColor: PURPLE }}
        />
        <Text style={styles.hint}>
          La vidéo s'ouvrira dans votre navigateur pour une meilleure qualité
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "#111827",
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
  },
  errorText: {
    color: "#F87171",
    fontSize: 16,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    gap: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  videoIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
