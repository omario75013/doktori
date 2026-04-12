import { useState, useEffect } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck, RotateCw } from "lucide-react-native";
import { colors, spacing, shadow } from "@/lib/theme";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { setToken, setPatient } from "@/lib/auth";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

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

  const maskedPhone = phone ? phone.slice(0, -3) + "•••" : "";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconWrap, shadow.md]}>
          <ShieldCheck size={36} color={colors.primary} />
        </View>

        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Entrez le code à 6 chiffres envoyé au
        </Text>
        <Text style={styles.phone}>{maskedPhone}</Text>

        <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
          <OtpInput onComplete={handleVerify} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <View style={styles.verifyingRow}>
            <View style={styles.loadingDot} />
            <Text style={styles.hint}>Vérification en cours...</Text>
          </View>
        ) : null}

        <View style={styles.resendRow}>
          {resendTimer > 0 ? (
            <Text style={styles.hint}>
              Renvoyer dans <Text style={styles.timerBold}>{resendTimer}s</Text>
            </Text>
          ) : (
            <Pressable style={styles.resendBtn} onPress={handleResend}>
              <RotateCw size={16} color={colors.primary} />
              <Text style={styles.resendText}>Renvoyer le code</Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: "center", padding: spacing.xl, alignItems: "center" },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primaryFaint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, textAlign: "center", letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: colors.slate500, textAlign: "center", marginTop: spacing.sm },
  phone: { fontSize: 16, fontWeight: "700", color: colors.ink, textAlign: "center", marginTop: 4 },
  error: { fontSize: 14, color: colors.red, textAlign: "center", marginTop: spacing.sm, fontWeight: "500" },
  verifyingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  hint: { fontSize: 14, color: colors.slate500, textAlign: "center" },
  timerBold: { fontWeight: "700", color: colors.ink },
  resendRow: { alignItems: "center", marginTop: spacing.xl },
  resendBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: spacing.sm },
  resendText: { fontSize: 15, fontWeight: "600", color: colors.primary },
});
