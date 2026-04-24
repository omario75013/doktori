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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type RegisterResponse = {
  token: string;
  user: { id: string; name: string; phone: string; email: string | null; role: "patient" };
};

export default function PatientSignup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password) {
      Alert.alert("Champs requis", "Prénom, nom, téléphone et mot de passe obligatoires");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        password,
      };
      if (email.trim()) body.email = email.trim().toLowerCase();
      if (dob.trim()) body.dateOfBirth = dob.trim();

      const res = await api<RegisterResponse>("/api/auth/patient-register", {
        method: "POST",
        skipAuth: true,
        body,
      });
      const SecureStore = await import("expo-secure-store");
      await SecureStore.setItemAsync(PATIENT_TOKEN_KEY, res.token);
      router.replace("/(patient)/home");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>Doktori</Text>
            <Text style={styles.tagline}>Créer un compte patient</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Karim"
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Ben Ali"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Téléphone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>+216</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="22 123 456"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
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
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date de naissance (JJ/MM/AAAA)</Text>
              <TextInput
                style={styles.input}
                value={dob}
                onChangeText={setDob}
                placeholder="01/01/1990"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                (loading || pressed) && { opacity: 0.75 },
              ]}
              onPress={submit}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Création…" : "Créer mon compte"}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.link}>
              <Text style={styles.linkText}>Déjà un compte ? Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.teal },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing["3xl"] },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xs },
  brand: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: 15 },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    gap: spacing.md,
  },
  row: { flexDirection: "row", gap: spacing.sm },
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
  phoneRow: { flexDirection: "row", gap: spacing.xs },
  prefix: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  prefixText: { fontSize: 16, color: colors.foreground, fontWeight: "600" },
  phoneInput: { flex: 1 },
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center" },
  linkText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
});
