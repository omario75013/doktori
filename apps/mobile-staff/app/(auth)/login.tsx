import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors, spacing, radii, setStoredToken, api } from "@doktori/mobile-core";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "doctor" | "secretary";
    doctorId?: string;
  };
};

export default function StaffLogin() {
  const params = useLocalSearchParams<{ role: string }>();
  const role = params.role === "secretary" ? "secretary" : "doctor";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert("Champs requis", "Email et mot de passe obligatoires");
      return;
    }
    setLoading(true);
    try {
      const res = await api<LoginResponse>("/api/auth/staff-login", {
        method: "POST",
        skipAuth: true,
        body: { email: email.trim(), password, role },
      });
      await setStoredToken(res.token);
      router.replace(role === "doctor" ? "/(doctor)/home" : "/(secretary)/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      if (msg.includes("vérification")) {
        Alert.alert("Compte en attente", msg);
      } else {
        Alert.alert("Connexion échouée", msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const roleLabel = role === "doctor" ? "Médecin" : "Secrétaire";
  const accent = role === "doctor" ? colors.teal : colors.tealDark;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={[styles.brand, { color: accent }]}>Doktori Pro</Text>
          <Text style={styles.title}>Espace {roleLabel}</Text>
          <Text style={styles.subtitle}>
            Connectez-vous avec votre compte {role === "doctor" ? "médecin" : "secrétaire"}.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={role === "doctor" ? "prenom.nom@doktori.tn" : "secretaire@doktori.tn"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
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
              { backgroundColor: accent },
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
            onPress={() => router.replace("/(auth)/role")}
            style={styles.link}
          >
            <Text style={[styles.linkText, { color: accent }]}>
              Pas vous ? Changer de rôle
            </Text>
          </Pressable>

          {role === "doctor" && (
            <Pressable onPress={() => router.push("/(auth)/doctor-signup")} style={styles.link}>
              <Text style={[styles.linkText, { color: accent }]}>Créer un compte médecin</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.md },
  brand: { fontSize: 28, fontWeight: "800", marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.foregroundSecondary, marginBottom: spacing.lg },
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
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", marginTop: spacing.sm },
  linkText: { fontSize: 14, fontWeight: "600" },
});
