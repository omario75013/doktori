import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { getStoredToken, colors, spacing } from "@doktori/mobile-core";

/**
 * Root router — decides where to send the user based on whether they have a
 * valid JWT in secure storage. Short flicker is acceptable (100–300 ms on cold
 * start). We'll trade this for a native splash screen later.
 */
export default function Index() {
  const [state, setState] = useState<"loading" | "signedIn" | "signedOut">("loading");

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      setState(token ? "signedIn" : "signedOut");
    })();
  }, []);

  if (state === "loading") {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.brand}>Doktori</Text>
      </View>
    );
  }

  return <Redirect href={state === "signedIn" ? "/(tabs)/home" : "/(auth)/login"} />;
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
