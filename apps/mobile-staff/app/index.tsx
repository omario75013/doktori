import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { getStoredToken, colors, spacing } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";
const ROLE_KEY = "doktori.staff.role";
const ONBOARDING_KEY = "doktori.onboarding.done";

export default function Index() {
  const [decision, setDecision] = useState<
    | { kind: "loading" }
    | { kind: "onboarding" }
    | { kind: "patient" }
    | { kind: "authed"; role: "doctor" | "secretary" }
    | { kind: "needs-login"; role: "doctor" | "secretary" }
    | { kind: "needs-role" }
  >({ kind: "loading" });

  useEffect(() => {
    (async () => {
      const SecureStore = await import("expo-secure-store").catch(() => null);

      // Check onboarding first
      const onboardingDone = SecureStore
        ? await SecureStore.getItemAsync(ONBOARDING_KEY)
        : null;
      if (!onboardingDone) {
        setDecision({ kind: "onboarding" });
        return;
      }

      const patientToken = SecureStore
        ? await SecureStore.getItemAsync(PATIENT_TOKEN_KEY)
        : null;

      if (patientToken) {
        setDecision({ kind: "patient" });
        return;
      }

      const staffToken = await getStoredToken();
      const storedRole = SecureStore
        ? ((await SecureStore.getItemAsync(ROLE_KEY)) as "doctor" | "secretary" | null)
        : null;

      if (staffToken && storedRole) {
        setDecision({ kind: "authed", role: storedRole });
        return;
      }
      // No valid token → always show role picker, never jump straight to a login form
      setDecision({ kind: "needs-role" });
    })();
  }, []);

  if (decision.kind === "loading") {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.brand}>Doktori</Text>
      </View>
    );
  }

  if (decision.kind === "onboarding") {
    return <Redirect href="/(auth)/onboarding" />;
  }
  if (decision.kind === "patient") {
    return <Redirect href="/(patient)/home" />;
  }
  if (decision.kind === "authed") {
    return <Redirect href={decision.role === "doctor" ? "/(doctor)/home" : "/(secretary)/dashboard"} />;
  }
  if (decision.kind === "needs-login") {
    return <Redirect href={`/(auth)/login?role=${decision.role}`} />;
  }
  return <Redirect href="/(auth)/patient-login" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  brand: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: "700",
  },
});
