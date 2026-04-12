import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Stethoscope, Phone } from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const phoneDigits = phone.replace(/\D/g, "");
  const fullPhone = `+216${phoneDigits}`;
  const isValid = phoneDigits.length === 8;

  async function handleSend() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await api.requestOtp(fullPhone);
      router.push({ pathname: "/(auth)/otp", params: { phone: fullPhone } });
    } catch (e: any) {
      setError(e.message || "Erreur d'envoi du code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Top gradient area */}
      <View style={styles.heroArea}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={styles.logoWrap}>
          <Stethoscope size={36} color={colors.white} strokeWidth={1.8} />
        </View>
        <Text style={styles.brand}>Doktori</Text>
        <Text style={styles.tagline}>Votre santé, simplement.</Text>
      </View>

      {/* Form card */}
      <View style={[styles.formCard, shadow.lg]}>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Entrez votre numéro pour recevoir un code de vérification
        </Text>

        <View style={styles.phoneRow}>
          <View style={styles.prefix}>
            <Text style={styles.flag}>🇹🇳</Text>
            <Text style={styles.prefixText}>+216</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="XX XXX XXX"
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(""); }}
              keyboardType="phone-pad"
              maxLength={8}
              error={error || undefined}
            />
          </View>
        </View>

        <Button
          title="Recevoir le code"
          onPress={handleSend}
          loading={loading}
          disabled={!isValid}
          size="lg"
          icon={<Phone size={18} color={colors.white} />}
          style={{ marginTop: spacing.lg, width: "100%" }}
        />

        <Text style={styles.legal}>
          En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  heroArea: {
    flex: 0.4,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    overflow: "hidden",
  },
  decorCircle1: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primaryLight,
    opacity: 0.15,
  },
  decorCircle2: {
    position: "absolute",
    bottom: 10,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primaryLight,
    opacity: 0.1,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  brand: { fontSize: 32, fontWeight: "800", color: colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  formCard: {
    flex: 0.6,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: spacing.sm, lineHeight: 20 },
  phoneRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg },
  prefix: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    marginTop: spacing.md,
  },
  flag: { fontSize: 18 },
  prefixText: { fontSize: 16, fontWeight: "600", color: colors.ink },
  legal: {
    fontSize: 12,
    color: colors.slate400,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 17,
  },
});
