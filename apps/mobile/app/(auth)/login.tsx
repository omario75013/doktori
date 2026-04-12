import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  Animated, Easing, StatusBar, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Stethoscope, Phone, ArrowRight } from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

const { width, height } = Dimensions.get("window");

function FloatingCircle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });
  return (
    <Animated.View style={{
      position: "absolute", left: x, top: y, width: size, height: size,
      borderRadius: size / 2, backgroundColor: "rgba(255,255,255,0.08)",
      transform: [{ translateY }],
    }} />
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fadeIn = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, speed: 8, bounciness: 6, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, speed: 6, bounciness: 12, useNativeDriver: true }),
    ]).start();
  }, []);

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
      <StatusBar barStyle="light-content" />

      {/* Animated background */}
      <View style={styles.heroArea}>
        <FloatingCircle x={-30} y={20} size={160} delay={0} />
        <FloatingCircle x={width * 0.6} y={-20} size={120} delay={600} />
        <FloatingCircle x={width * 0.3} y={60} size={80} delay={1200} />

        <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoInner}>
            <Stethoscope size={40} color={colors.white} strokeWidth={1.6} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn, alignItems: "center" }}>
          <Text style={styles.brand}>Doktori</Text>
          <Text style={styles.tagline}>Votre santé, simplement.</Text>
          <View style={styles.trustRow}>
            <View style={styles.trustDot} />
            <Text style={styles.trustText}>500+ médecins</Text>
            <View style={styles.trustDot} />
            <Text style={styles.trustText}>100% gratuit</Text>
          </View>
        </Animated.View>
      </View>

      {/* Form card */}
      <Animated.View style={[styles.formCard, { transform: [{ translateY: cardSlide }], opacity: fadeIn }]}>
        <View style={styles.cardHandle} />

        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Entrez votre numéro pour recevoir un code de vérification par SMS
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
          icon={<ArrowRight size={18} color={colors.white} />}
          style={{ marginTop: spacing.lg, width: "100%" }}
        />

        <Text style={styles.legal}>
          En continuant, vous acceptez nos{" "}
          <Text style={styles.legalLink}>conditions d'utilisation</Text>
          {" "}et notre{" "}
          <Text style={styles.legalLink}>politique de confidentialité</Text>.
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  heroArea: {
    flex: 0.42, alignItems: "center", justifyContent: "center",
    paddingTop: 50, overflow: "hidden",
  },
  logoWrap: { marginBottom: spacing.lg },
  logoInner: {
    width: 80, height: 80, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
  },
  brand: {
    fontSize: 36, fontWeight: "900", color: colors.white,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16, color: "rgba(255,255,255,0.8)",
    marginTop: 4, fontWeight: "500",
  },
  trustRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: radius.full,
  },
  trustDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  trustText: {
    fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600",
  },
  formCard: {
    flex: 0.58, backgroundColor: colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 28, paddingTop: 20,
    ...shadow.lg,
  },
  cardHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.slate200,
    alignSelf: "center", marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26, fontWeight: "900", color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, color: colors.slate500,
    marginTop: spacing.sm, lineHeight: 22,
  },
  phoneRow: {
    flexDirection: "row", alignItems: "flex-start",
    gap: spacing.sm, marginTop: spacing.xl,
  },
  prefix: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.slate200,
    marginTop: spacing.md,
  },
  flag: { fontSize: 20 },
  prefixText: { fontSize: 16, fontWeight: "700", color: colors.ink },
  legal: {
    fontSize: 12, color: colors.slate400,
    textAlign: "center", marginTop: spacing.xl, lineHeight: 18,
  },
  legalLink: { color: colors.primary, fontWeight: "600" },
});
