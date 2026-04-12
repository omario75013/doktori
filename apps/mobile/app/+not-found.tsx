import { Link, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { MapPinOff } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page introuvable" }} />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <MapPinOff size={48} color={colors.slate400} />
        </View>
        <Text style={styles.title}>Page introuvable</Text>
        <Text style={styles.subtitle}>
          Cette page n'existe pas ou a été déplacée.
        </Text>
        <Link href="/" asChild>
          <Button title="Retour à l'accueil" size="lg" style={{ width: "100%" }} onPress={() => {}} />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: spacing.xl, backgroundColor: colors.white,
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: colors.slate100,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  subtitle: {
    fontSize: 15, color: colors.slate500,
    textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl,
  },
});
