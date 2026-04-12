import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  Pressable, Animated, Easing,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck, RotateCw, Lock } from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { OtpInput } from "@/components/ui/OtpInput";
import { api } from "@/lib/api";
import { setToken, setPatient } from "@/lib/auth";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, speed: 8, bounciness: 6, useNativeDriver: true }),
    ]).start();

    // Subtle pulse on the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  async function handleVerify(code: string) {
    setLoading(true);
    setError("");
    try {
      const result = await api.verifyOtp(phone, code);
      await setToken(result.token);
      await setPatient(result.patient);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendTimer(60);
    try {
      await api.requestOtp(phone);
    } catch (e: any) {
      setError(e.message || "Erreur lors du renvoi");
    }
  }

  const maskedPhone = phone ? phone.replace(/(\d{4})(\d{2})(\d+)/, "$1 $2 •••") : "";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Animated icon */}
        <Animated.View style={[styles.iconOuter, { transform: [{ scale: iconPulse }] }]}>
          <View style={[styles.iconWrap, shadow.lg]}>
            <ShieldCheck size={40} color={colors.primary} strokeWidth={1.6} />
          </View>
        </Animated.View>

        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Code envoyé par SMS au
        </Text>
        <View style={styles.phoneTag}>
          <Lock size={12} color={colors.primary} />
          <Text style={styles.phone}>{maskedPhone}</Text>
        </View>

        <View style={styles.otpWrap}>
          <OtpInput onComplete={handleVerify} />
        </View>

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.verifyingWrap}>
            <View style={styles.loadingDot} />
            <Text style={styles.hint}>Vérification en cours...</Text>
          </View>
        ) : null}

        <View style={styles.resendRow}>
          {resendTimer > 0 ? (
            <View style={styles.timerWrap}>
              <Text style={styles.hint}>Renvoyer dans </Text>
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>{resendTimer}s</Text>
              </View>
            </View>
          ) : (
            <Pressable style={styles.resendBtn} onPress={handleResend}>
              <RotateCw size={16} color={colors.primary} />
              <Text style={styles.resendText}>Renvoyer le code</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.helpText}>
          Vous n'avez pas reçu le SMS ? Vérifiez le numéro ou réessayez dans quelques instants.
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: "center", padding: spacing.xl, alignItems: "center" },
  iconOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.primaryFaint,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    fontSize: 28, fontWeight: "900", color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, color: colors.slate500, marginTop: spacing.sm,
  },
  phoneTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primaryFaint,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.full, marginTop: spacing.sm,
  },
  phone: { fontSize: 15, fontWeight: "700", color: colors.primary },
  otpWrap: { marginTop: spacing.xl, marginBottom: spacing.md },
  errorWrap: {
    backgroundColor: colors.redFaint,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  error: { fontSize: 14, color: colors.red, fontWeight: "600" },
  verifyingWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  loadingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },
  hint: { fontSize: 14, color: colors.slate500 },
  resendRow: { alignItems: "center", marginTop: spacing.xl },
  timerWrap: { flexDirection: "row", alignItems: "center" },
  timerBadge: {
    backgroundColor: colors.slate100,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.full,
  },
  timerText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  resendBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.full,
  },
  resendText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  helpText: {
    fontSize: 12, color: colors.slate400,
    textAlign: "center", marginTop: spacing.xl, lineHeight: 18,
    maxWidth: 280,
  },
});
