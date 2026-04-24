import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radii, clearStoredToken } from "@doktori/mobile-core";

export default function ProfilScreen() {
  async function handleLogout() {
    Alert.alert("Déconnexion", "Vous allez être déconnecté.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await clearStoredToken();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.sub}>
          Infos personnelles, préférences, langue — à construire
        </Text>
        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Se déconnecter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 14, color: colors.foregroundSecondary },
  button: {
    marginTop: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: { color: colors.danger, fontWeight: "700" },
});
