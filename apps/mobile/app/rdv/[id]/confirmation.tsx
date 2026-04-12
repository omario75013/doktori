// apps/mobile/app/rdv/[id]/confirmation.tsx
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { CircleCheckBig } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

export default function ConfirmationScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <CircleCheckBig size={72} color={colors.green} />
      <Text style={styles.title}>Rendez-vous confirmé !</Text>
      <Text style={styles.subtitle}>
        Vous recevrez un SMS de rappel la veille de votre consultation.
      </Text>
      <Button
        title="Voir mes rendez-vous"
        onPress={() => router.replace("/(tabs)/mes-rdv")}
        style={{ marginTop: spacing.xl, width: "100%" }}
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
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.white },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginTop: spacing.lg, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
});
