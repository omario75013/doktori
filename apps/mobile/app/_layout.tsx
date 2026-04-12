import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
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

  useEffect(() => {
    async function check() {
      const { initLocale } = await import("@/lib/i18n"); await initLocale();
      const token = await getToken();
      setIsAuthed(token !== null && isTokenValid(token));
      setIsReady(true);
    }
    check();
  }, []);

  useEffect(() => {
    if (!isReady || !fontsLoaded) return;
    SplashScreen.hideAsync();

    if (isAuthed) {
      import("@/lib/push").then(({ registerPushTokenIfNeeded }) => registerPushTokenIfNeeded());
    }

    const inAuth = segments[0] === "(auth)";
    if (!isAuthed && !inAuth) {
      router.replace("/(auth)/login");
    } else if (isAuthed && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isReady, fontsLoaded, isAuthed, segments]);

  if (!isReady || !fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.white }, headerTintColor: colors.primary }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="medecin/[slug]" options={{ title: "" }} />
      <Stack.Screen name="rdv/[slug]" options={{ title: "Prendre RDV" }} />
    </Stack>
  );
}
