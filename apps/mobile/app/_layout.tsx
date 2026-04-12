import { useEffect, useState, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { AppState } from "react-native";
import { getToken, isTokenValid } from "@/lib/auth";
import { colors } from "@/lib/theme";
import * as Notifications from "expo-notifications";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const checkAuth = useCallback(async () => {
    try {
      const { initLocale } = await import("@/lib/i18n");
      await initLocale();
    } catch {}
    const token = await getToken();
    const authed = token !== null && isTokenValid(token);
    setIsAuthed(authed);
    setIsReady(true);
    return authed;
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-check auth when app comes to foreground (catches post-OTP state)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAuth();
    });
    return () => sub.remove();
  }, [checkAuth]);

  // Re-check auth on every navigation (catches OTP → tabs transition)
  useEffect(() => {
    if (!isReady || !fontsLoaded) return;
    checkAuth().then((authed) => {
      SplashScreen.hideAsync();

      if (authed) {
        import("@/lib/push")
          .then(({ registerPushTokenIfNeeded }) => registerPushTokenIfNeeded())
          .catch(() => {});
      }

      const inAuth = segments[0] === "(auth)";
      if (!authed && !inAuth) {
        router.replace("/(auth)/login");
      } else if (authed && inAuth) {
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
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="medecin/[slug]" options={{ title: "" }} />
      <Stack.Screen name="rdv/[slug]" options={{ title: "Prendre RDV" }} />
    </Stack>
  );
}
