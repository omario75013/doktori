import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants from "expo-constants";
import { setApiBaseUrl, setLocale, loadMessages } from "@doktori/mobile-core";

// Hand-rolled minimal translations until we wire the copy-from-web step.
// The final pipeline reads apps/web/i18n/messages/{fr,ar}.json at prebuild
// time; this keeps the first runnable build self-contained.
import fr from "../i18n/fr.json";
import ar from "../i18n/ar.json";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 1. API base URL — read from app.json extra or EXPO_PUBLIC_API_BASE_URL
    const apiBase =
      (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      "http://localhost:3000";
    setApiBaseUrl(apiBase);

    // 2. i18n
    loadMessages("fr", fr as Record<string, unknown>);
    loadMessages("ar", ar as Record<string, unknown>);
    setLocale("fr");

    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
