// apps/mobile/app/rdv/[id]/confirmation.tsx
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheckBig, Video } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

export default function ConfirmationScreen() {
  const router = useRouter();
  // `type` is an optional query param set by the booking screen.
  // When type === "teleconsult", show the video consultation messaging.
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isTeleconsult = type === "teleconsult";

  return (
    <View style={styles.container}>
      <CircleCheckBig size={72} color={colors.green} />
      <Text style={styles.title}>Rendez-vous confirmé !</Text>

      {isTeleconsult ? (
        <View style={styles.videoBadgeWrapper}>
          <View style={styles.videoBadge}>
            <Video size={14} color={colors.white} />
            <Text style={styles.videoBadgeText}>Consultation vidéo</Text>
          </View>
          <Text style={styles.subtitle}>
            Vous recevrez un lien vidéo avant votre rendez-vous.
          </Text>
        </View>
      ) : (
        <Text style={styles.subtitle}>
          Vous recevrez un SMS de rappel la veille de votre consultation.
        </Text>
      )}

      {isTeleconsult && (
        <Button
          title="Rejoindre (disponible bientôt)"
          onPress={() => {}}
          disabled
          style={styles.joinBtn}
        />
      )}

      <Button
        title="Voir mes rendez-vous"
        onPress={() => router.replace("/(tabs)/mes-rdv")}
        style={{ marginTop: isTeleconsult ? spacing.sm : spacing.xl, width: "100%" }}
      />
      <Button
        title="Retour à l'accueil"
        onPress={() => router.replace("/(tabs)")}
        variant="secondary"
        style={{ marginTop: spacing.sm, width: "100%" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: spacing.xl, backgroundColor: colors.white,
  },
  title: {
    fontSize: 24, fontWeight: "700", color: colors.ink,
    marginTop: spacing.lg, textAlign: "center",
  },
  subtitle: {
    fontSize: 14, color: colors.slate500, textAlign: "center",
    marginTop: spacing.sm, lineHeight: 20,
  },
  videoBadgeWrapper: { alignItems: "center", marginTop: spacing.md },
  videoBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#7C3AED", paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  videoBadgeText: { fontSize: 13, fontWeight: "600", color: colors.white },
  joinBtn: { marginTop: spacing.xl, width: "100%", backgroundColor: "#7C3AED" },
});
