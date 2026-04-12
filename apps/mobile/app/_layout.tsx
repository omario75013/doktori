import { useEffect, useState, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getToken, isTokenValid } from "@/lib/auth";
import { colors } from "@/lib/theme";
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const checkAuth = useCallback(async () => {
    try {
      const { initLocale } = await import("@/lib/i18n");
      await initLocale();
    } catch {}

    // Check onboarding
    let onboardingDone = false;
    try {
      onboardingDone = (await SecureStore.getItemAsync("onboarding_done")) === "1";
    } catch {}
    setNeedsOnboarding(!onboardingDone);

    const token = await getToken();
    const authed = token !== null && isTokenValid(token);
    setIsAuthed(authed);
    setIsReady(true);
    return { authed, onboardingDone };
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAuth();
    });
    return () => sub.remove();
  }, [checkAuth]);

  useEffect(() => {
    if (!isReady || !fontsLoaded) return;
    checkAuth().then(({ authed, onboardingDone }) => {
      SplashScreen.hideAsync();

      // Push notifications disabled until EAS project is configured
      // if (authed) {
      //   import("@/lib/push").then(({ registerPushTokenIfNeeded }) => registerPushTokenIfNeeded()).catch(() => {});
      // }

      const inOnboarding = segments[0] === "onboarding";
      const inAuth = segments[0] === "(auth)";

      if (!onboardingDone && !inOnboarding) {
        router.replace("/onboarding");
      } else if (onboardingDone && !authed && !inAuth) {
        router.replace("/(auth)/login");
      } else if (authed && (inAuth || inOnboarding)) {
        router.replace("/(tabs)");
      }
    });
  }, [isReady, fontsLoaded, segments]);

  if (!isReady || !fontsLoaded) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="medecin/[slug]" options={{ title: "" }} />
      <Stack.Screen name="rdv/[slug]" options={{ title: "Prendre RDV" }} />
    </Stack>
  );
}
