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
import { colors, spacing, radii, setStoredToken, api, t, useLocale } from "@doktori/mobile-core";

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
  const { locale } = useLocale();

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert(t("auth.missingFields"), t("auth.missingFieldsDesc"));
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
        Alert.alert(t("auth.pendingAccount"), msg);
      } else {
        Alert.alert(t("auth.loginFailed"), msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const roleLabel = role === "doctor" ? t("auth.doctor") : t("auth.secretary");
  const accent = role === "doctor" ? colors.teal : colors.tealDark;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={[styles.brand, { color: accent }]}>{t("auth.appName")}</Text>
          <Text style={styles.title}>{t("auth.staffSpace")}{roleLabel}</Text>
          <Text style={styles.subtitle}>
            {t("auth.loginWith")}{role === "doctor" ? t("auth.doctor").toLowerCase() : t("auth.secretary").toLowerCase()}.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.email")}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={role === "doctor" ? t("auth.emailPlaceholderDoctor") : t("auth.emailPlaceholderSecretary")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("auth.password")}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
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
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(auth)/role")}
            style={styles.link}
          >
            <Text style={[styles.linkText, { color: accent }]}>
              {t("auth.switchRole")}
            </Text>
          </Pressable>

          {role === "doctor" && (
            <Pressable onPress={() => router.push("/(auth)/doctor-signup")} style={styles.link}>
              <Text style={[styles.linkText, { color: accent }]}>{t("auth.createDoctorAccount")}</Text>
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
