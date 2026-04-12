import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
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
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>D</Text>
        </View>
        <Text style={styles.title}>Bienvenue sur Doktori</Text>
        <Text style={styles.subtitle}>
          Entrez votre numéro de téléphone pour vous connecter
        </Text>

        <View style={styles.phoneRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+216</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label=""
              placeholder="XX XXX XXX"
              value={phone}
              onChangeText={setPhone}
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
          style={{ marginTop: spacing.lg }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: "center", padding: spacing.xl },
  logo: {
    width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: spacing.lg,
  },
  logoText: { fontSize: 28, fontWeight: "800", color: colors.white },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl },
  phoneRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  prefix: {
    backgroundColor: colors.mist, paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
  prefixText: { fontSize: 15, fontWeight: "600", color: colors.ink },
});
