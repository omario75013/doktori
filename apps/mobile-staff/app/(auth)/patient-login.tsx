import { useState, useRef, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";

const PATIENT_TOKEN_KEY = "doktori.patient.token";
const RESEND_COOLDOWN = 60;

type OtpRequestResponse = { message: string };
type OtpVerifyResponse = {
  token: string;
  user: { id: string; name: string; phone: string; role: "patient" };
};

export default function PatientLogin() {
  const { locale } = useLocale();
  const [loginTab, setLoginTab] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullPhone = "+216" + digits.trim();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function requestOtp() {
    const trimmed = digits.trim();
    if (trimmed.length < 8) {
      Alert.alert(t("patientAuth.invalidPhone"), t("patientAuth.invalidPhoneDesc"));
      return;
    }
    setLoading(true);
    try {
      await api<OtpRequestResponse>("/api/auth/otp/request", {
        method: "POST",
        skipAuth: true,
        body: { phone: fullPhone },
      });
      setStep("code");
      setCode("");
      startCooldown();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("patientAuth.sendError"));
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (cooldown > 0) return;
    await requestOtp();
  }

  async function loginWithEmail(identifier: string, password: string) {
    setLoading(true);
    try {
      const res = await api<{ token: string; user: { id: string; name: string; role: "patient" } }>(
        "/api/auth/patient-login",
        { method: "POST", skipAuth: true, body: { identifier, password } }
      );
      const SecureStore = await import("expo-secure-store").catch(() => null);
      if (SecureStore) {
        await SecureStore.setItemAsync(PATIENT_TOKEN_KEY, res.token);
      }
      router.replace("/(patient)/home");
    } catch (e) {
      Alert.alert(t("patientAuth.loginError"), e instanceof Error ? e.message : t("patientAuth.loginErrorDesc"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (code.trim().length !== 6) {
      Alert.alert(t("patientAuth.invalidCode"), t("patientAuth.invalidCodeDesc"));
      return;
    }
    setLoading(true);
    try {
      const res = await api<OtpVerifyResponse>("/api/auth/otp/verify", {
        method: "POST",
        skipAuth: true,
        body: { phone: fullPhone, code: code.trim() },
      });
      const SecureStore = await import("expo-secure-store").catch(() => null);
      if (SecureStore) {
        await SecureStore.setItemAsync(PATIENT_TOKEN_KEY, res.token);
      }
      router.replace("/(patient)/home");
    } catch (e) {
      Alert.alert(t("patientAuth.wrongCode"), e instanceof Error ? e.message : t("patientAuth.wrongCodeDesc"));
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand header */}
          <View style={styles.header}>
            <Text style={styles.brand}>{t("patientAuth.appName")}</Text>
            <Text style={styles.tagline}>{t("patientAuth.tagline")}</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab switcher — only visible on phone step */}
            {step === "phone" && (
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tabBtn, loginTab === "phone" && styles.tabBtnActive]}
                  onPress={() => setLoginTab("phone")}
                >
                  <Text style={[styles.tabBtnText, loginTab === "phone" && styles.tabBtnTextActive]}>
                    {t("patientAuth.tabPhone")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tabBtn, loginTab === "email" && styles.tabBtnActive]}
                  onPress={() => setLoginTab("email")}
                >
                  <Text style={[styles.tabBtnText, loginTab === "email" && styles.tabBtnTextActive]}>
                    {t("patientAuth.tabEmail")}
                  </Text>
                </Pressable>
              </View>
            )}

            {step === "code" ? (
              <CodeStep
                phone={fullPhone}
                code={code}
                onChangeCode={setCode}
                loading={loading}
                cooldown={cooldown}
                onVerify={verifyOtp}
                onResend={resendOtp}
                onBack={() => setStep("phone")}
              />
            ) : loginTab === "phone" ? (
              <PhoneStep
                digits={digits}
                onChangeDigits={setDigits}
                loading={loading}
                onSubmit={requestOtp}
              />
            ) : (
              <EmailStep loading={loading} onSubmit={loginWithEmail} />
            )}
          </View>

          {/* Espace Pro link */}
          <View style={styles.proRow}>
            <View style={styles.line} />
            <Text style={styles.orText}>{t("patientAuth.or")}</Text>
            <View style={styles.line} />
          </View>
          <Pressable
            style={({ pressed }) => [styles.proBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(auth)/role")}
          >
            <Text style={styles.proBtnText}>{t("patientAuth.proSpace")}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Phone step ───────────────────────────────────────────────────────────────

function PhoneStep({
  digits,
  onChangeDigits,
  loading,
  onSubmit,
}: {
  digits: string;
  onChangeDigits: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  return (
    <View style={stepStyles.root}>
      <Text style={stepStyles.title}>{t("patientAuth.tabPhone")}</Text>
      <Text style={stepStyles.hint}>
        {t("patientAuth.phoneInstruction")}
      </Text>

      <View style={stepStyles.field}>
        <Text style={stepStyles.label}>{t("patientAuth.tabPhone")}</Text>
        <View style={stepStyles.phoneRow}>
          <View style={stepStyles.prefix}>
            <Text style={stepStyles.prefixText}>+216</Text>
          </View>
          <TextInput
            testID="phone-input"
            style={[stepStyles.input, stepStyles.phoneInput]}
            value={digits}
            onChangeText={onChangeDigits}
            placeholder={t("patientAuth.phonePlaceholder")}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
          />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          stepStyles.primaryBtn,
          (loading || pressed) && { opacity: 0.75 },
        ]}
        onPress={onSubmit}
        disabled={loading}
      >
        <Text style={stepStyles.primaryBtnText}>
          {loading ? t("patientAuth.sending") : t("patientAuth.receiveCode")}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push("/(auth)/patient-signup")} style={stepStyles.link}>
        <Text style={stepStyles.linkText}>{t("patientAuth.createAccount")}</Text>
      </Pressable>
    </View>
  );
}

// ─── Email step ───────────────────────────────────────────────────────────────

function EmailStep({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (identifier: string, password: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <View style={stepStyles.root}>
      <Text style={stepStyles.title}>{t("patientAuth.tabEmail")}</Text>
      <Text style={stepStyles.hint}>{t("patientAuth.emailPasswordHint")}</Text>

      <View style={stepStyles.field}>
        <Text style={stepStyles.label}>{t("patientAuth.tabEmail")} / {t("patientAuth.tabPhone")}</Text>
        <TextInput
          style={stepStyles.input}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder={t("patientAuth.emailPlaceholder")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={stepStyles.field}>
        <Text style={stepStyles.label}>{t("auth.password")}</Text>
        <View style={stepStyles.pwdRow}>
          <TextInput
            style={[stepStyles.input, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder={t("patientAuth.passwordPlaceholder")}
            secureTextEntry={!showPwd}
            autoComplete="password"
          />
          <Pressable onPress={() => setShowPwd((v) => !v)} style={stepStyles.eyeBtn} hitSlop={8}>
            <Ionicons
              name={showPwd ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.foregroundSecondary}
            />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          stepStyles.primaryBtn,
          (loading || pressed) && { opacity: 0.75 },
        ]}
        onPress={() => onSubmit(identifier.trim(), password)}
        disabled={loading}
      >
        <Text style={stepStyles.primaryBtnText}>
          {loading ? t("patientAuth.signingIn") : t("patientAuth.signIn")}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push("/(auth)/patient-signup")} style={stepStyles.link}>
        <Text style={stepStyles.linkText}>{t("patientAuth.createAccount")}</Text>
      </Pressable>
    </View>
  );
}

// ─── Code step ────────────────────────────────────────────────────────────────

function CodeStep({
  phone,
  code,
  onChangeCode,
  loading,
  cooldown,
  onVerify,
  onResend,
  onBack,
}: {
  phone: string;
  code: string;
  onChangeCode: (v: string) => void;
  loading: boolean;
  cooldown: number;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const maskedPhone =
    phone.length > 7
      ? phone.slice(0, 5) + "X".repeat(phone.length - 7) + phone.slice(-2)
      : phone;

  return (
    <View style={stepStyles.root}>
      {/* Back arrow */}
      <Pressable onPress={onBack} style={stepStyles.backRow} hitSlop={12}>
        <View style={stepStyles.backArrow} />
        <Text style={stepStyles.backText}>{t("common.back")}</Text>
      </Pressable>

      <Text style={stepStyles.title}>{t("patientAuth.verificationTitle")}</Text>
      <Text style={stepStyles.hint}>
        {t("patientAuth.codeSentTo")}{" "}
        <Text style={stepStyles.hintBold}>{maskedPhone}</Text>
      </Text>

      {/* 6-digit input */}
      <View style={stepStyles.field}>
        <Text style={stepStyles.label}>{t("patientAuth.codeLabel")}</Text>
        <TextInput
          testID="otp-input"
          style={stepStyles.otpInput}
          value={code}
          onChangeText={(v) => onChangeCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder={t("patientAuth.codePlaceholder")}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          autoComplete="one-time-code"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          stepStyles.primaryBtn,
          (loading || pressed) && { opacity: 0.75 },
        ]}
        onPress={onVerify}
        disabled={loading}
      >
        <Text style={stepStyles.primaryBtnText}>
          {loading ? t("patientAuth.verifying") : t("patientAuth.verify")}
        </Text>
      </Pressable>

      {/* Resend */}
      <Pressable
        onPress={onResend}
        disabled={cooldown > 0}
        style={stepStyles.link}
      >
        <Text
          style={[
            stepStyles.linkText,
            cooldown > 0 && { color: colors.foregroundSecondary },
          ]}
        >
          {cooldown > 0
            ? t("patientAuth.resendTimer", { sec: cooldown })
            : t("patientAuth.resend")}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Shared sub-styles ────────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  root: { gap: spacing.md },
  title: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  hint: { fontSize: 14, color: colors.foregroundSecondary, lineHeight: 20 },
  hintBold: { fontWeight: "700", color: colors.foreground },
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
  otpInput: {
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    backgroundColor: colors.bgSecondary,
    letterSpacing: 12,
  },
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  backArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.teal,
    transform: [{ rotate: "45deg" }],
    marginRight: 2,
  },
  backText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  pwdRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  eyeBtn: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Screen-level styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.teal },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xs },
  brand: { color: "#FFFFFF", fontSize: 34, fontWeight: "800" },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: 15 },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
  },
  proRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.3)" },
  orText: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radii.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.bg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: { fontSize: 14, fontWeight: "600", color: colors.foregroundSecondary },
  tabBtnTextActive: { color: colors.teal },
  proBtn: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  proBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
