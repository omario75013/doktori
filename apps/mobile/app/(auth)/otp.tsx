import { useState, useEffect } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing } from "@/lib/theme";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { setToken, setPatient } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";

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
      trackEvent("login");
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Entrez le code envoyé au {phone}
        </Text>

        <View style={{ marginVertical: spacing.xl }}>
          <OtpInput onComplete={handleVerify} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.hint}>Vérification...</Text> : null}

        <View style={styles.resendRow}>
          {resendTimer > 0 ? (
            <Text style={styles.hint}>Renvoyer dans {resendTimer}s</Text>
          ) : (
            <Button title="Renvoyer le code" onPress={handleResend} variant="secondary" />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: "center", padding: spacing.xl },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: spacing.sm },
  error: { fontSize: 14, color: colors.red, textAlign: "center", marginTop: spacing.sm },
  hint: { fontSize: 14, color: colors.slate500, textAlign: "center" },
  resendRow: { alignItems: "center", marginTop: spacing.lg },
});
