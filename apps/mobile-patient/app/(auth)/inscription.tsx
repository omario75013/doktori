import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radii } from "@doktori/mobile-core";

export default function SignupScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          L&apos;inscription arrive bientôt — contactez-nous pour un accès anticipé.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Retour</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.foreground },
  subtitle: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
