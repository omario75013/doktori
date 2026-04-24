import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

async function getPatientToken(): Promise<string | null> {
  const SecureStore = await import("expo-secure-store").catch(() => null);
  return SecureStore ? SecureStore.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

type BookingParams = {
  slug: string;
  doctorId: string;
  slot: string;
  slotEnd: string;
  typeId: string;
  typeName: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAddress: string;
};

export default function BookingFlow() {
  const params = useLocalSearchParams<BookingParams>();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // inline login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    getPatientToken().then((t) => setIsLoggedIn(!!t));
  }, []);

  async function confirm() {
    const token = await getPatientToken();
    if (!token) { setStep(3); return; }
    setLoading(true);
    try {
      await api("/api/appointments/patient", {
        method: "POST",
        token,
        body: {
          doctorId: params.doctorId,
          startsAt: params.slot,
          endsAt: params.slotEnd,
          typeId: params.typeId || undefined,
          reason: reason.trim() || undefined,
        },
      });
      Alert.alert("RDV confirmé !", "Votre rendez-vous a été enregistré.", [
        { text: "OK", onPress: () => router.replace("/(patient)/rendez-vous") },
      ]);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur lors de la réservation");
    } finally {
      setLoading(false);
    }
  }

  async function loginThenBook() {
    if (!loginIdentifier.trim() || !loginPassword) {
      Alert.alert("Champs requis");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await api<{ token: string }>("/api/auth/patient-login", {
        method: "POST",
        skipAuth: true,
        body: { identifier: loginIdentifier.trim(), password: loginPassword },
      });
      const SecureStore = await import("expo-secure-store");
      await SecureStore.setItemAsync(PATIENT_TOKEN_KEY, res.token);
      setIsLoggedIn(true);
      await confirm();
    } catch (e) {
      Alert.alert("Connexion échouée", e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoginLoading(false);
    }
  }

  const formattedDate = params.slot
    ? new Date(params.slot).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const formattedTime = params.slot
    ? new Date(params.slot).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.back())} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Prendre RDV</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.stepDot, s <= step && styles.stepDotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Motif (optionnel)</Text>
            <Text style={styles.stepMeta}>{params.typeName} • {params.doctorName}</Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="Décrivez brièvement votre motif de consultation…"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.primaryBtnText}>Suivant</Text>
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Récapitulatif</Text>
            <View style={styles.summaryCard}>
              <SummaryRow icon="person-outline" label="Médecin" value={params.doctorName} />
              <SummaryRow icon="medical-outline" label="Spécialité" value={params.doctorSpecialty} />
              <SummaryRow icon="clipboard-outline" label="Motif" value={params.typeName} />
              <SummaryRow icon="calendar-outline" label="Date" value={`${formattedDate} à ${formattedTime}`} />
              <SummaryRow icon="location-outline" label="Adresse" value={params.doctorAddress} />
              {reason ? <SummaryRow icon="chatbubble-outline" label="Note" value={reason} /> : null}
            </View>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, (loading || pressed) && { opacity: 0.75 }]}
              onPress={() => {
                if (isLoggedIn) { confirm(); } else { setStep(3); }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isLoggedIn ? "Confirmer le RDV" : "Continuer"}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>Connexion requise</Text>
            <Text style={styles.stepMeta}>Connectez-vous pour finaliser votre réservation</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Téléphone ou Email</Text>
              <TextInput
                style={styles.input}
                value={loginIdentifier}
                onChangeText={setLoginIdentifier}
                placeholder="22123456 ou email"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="••••••••"
                secureTextEntry
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, (loginLoading || pressed) && { opacity: 0.75 }]}
              onPress={loginThenBook}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Se connecter et confirmer</Text>
              )}
            </Pressable>
            <Pressable onPress={() => router.push("/(auth)/patient-signup")} style={styles.link}>
              <Text style={styles.linkText}>Créer un compte</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={16} color={colors.teal} style={{ width: 20 }} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.foreground },
  stepRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md },
  stepDot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.teal },
  content: { padding: spacing.xl, paddingBottom: spacing["3xl"] },
  stepSection: { gap: spacing.md },
  stepTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  stepMeta: { fontSize: 14, color: colors.foregroundSecondary },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.foreground,
    minHeight: 100,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  summaryLabel: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary, width: 80 },
  summaryValue: { flex: 1, fontSize: 13, color: colors.foreground },
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
  },
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center" },
  linkText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
});
