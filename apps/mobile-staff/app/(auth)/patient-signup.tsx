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
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

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
  const { locale } = useLocale();

  async function submit() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password) {
      Alert.alert(t("patientSignup.missingFields"), t("patientSignup.missingFieldsDesc"));
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
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("patientSignup.unknownError"));
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
            <Text style={styles.brand}>{t("patientAuth.appName")}</Text>
            <Text style={styles.tagline}>{t("patientSignup.title")}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>{t("patientSignup.firstName")}</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t("patientSignup.firstNamePlaceholder")}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>{t("patientSignup.lastName")}</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t("patientSignup.lastNamePlaceholder")}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("patientSignup.phone")}</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>{t("patientSignup.phonePrefix")}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t("patientSignup.phonePlaceholder")}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("patientSignup.emailOptional")}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t("patientSignup.emailPlaceholder")}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("patientSignup.password")}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t("patientSignup.passwordPlaceholder")}
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("patientSignup.dob")}</Text>
              <TextInput
                style={styles.input}
                value={dob}
                onChangeText={setDob}
                placeholder={t("patientSignup.dobPlaceholder")}
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
                {loading ? t("patientSignup.creating") : t("patientSignup.createAccount")}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.link}>
              <Text style={styles.linkText}>{t("patientSignup.alreadyAccount")}</Text>
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
