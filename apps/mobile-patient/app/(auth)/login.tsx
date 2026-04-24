import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radii, setStoredToken, api } from "@doktori/mobile-core";

type LoginResponse = {
  token: string;
  user: { id: string; phone: string; name: string };
};

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!phone.trim() || !password.trim()) {
      Alert.alert("Champs requis", "Téléphone et mot de passe obligatoires");
      return;
    }
    setLoading(true);
    try {
      // Patient login endpoint is TBD on the backend — placeholder shape.
      const res = await api<LoginResponse>("/api/auth/patient-login", {
        method: "POST",
        skipAuth: true,
        body: { phone: phone.trim(), password },
      });
      await setStoredToken(res.token);
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert(
        "Connexion échouée",
        e instanceof Error ? e.message : "Erreur inconnue"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.brand}>Doktori</Text>
          <Text style={styles.title}>Bon retour</Text>
          <Text style={styles.subtitle}>
            Connectez-vous pour gérer vos rendez-vous et consultations.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+216 XX XXX XXX"
              keyboardType="phone-pad"
              autoComplete="tel"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (loading || pressed) && { opacity: 0.75 },
            ]}
            onPress={submit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Connexion…" : "Se connecter"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/inscription")}
            style={styles.link}
          >
            <Text style={styles.linkText}>Créer un compte</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  brand: {
    color: colors.teal,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: spacing.xl,
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.foreground },
  subtitle: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    marginBottom: spacing.lg,
  },
  field: { gap: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", marginTop: spacing.sm },
  linkText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
});
