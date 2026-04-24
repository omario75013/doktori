import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { setApiBaseUrl, setLocale, loadMessages, api } from "@doktori/mobile-core";

import fr from "../i18n/fr.json";
import ar from "../i18n/ar.json";

// Expo Go (SDK 53+) removed remote push — detect it and skip gracefully
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Show notifications as banner + play sound when app is foregrounded
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function registerPushToken() {
  // Skip entirely in Expo Go — push is not supported there since SDK 53
  if (isExpoGo) return;
  const isDevice = Constants.isDevice ?? true;
  if (!isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  // Android needs explicit channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0891B2",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("calls", {
      name: "Appels entrants",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: "#0891B2",
      sound: "default",
      enableLights: true,
    });
    await Notifications.setNotificationChannelAsync("bells", {
      name: "Sonnettes médecin",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: "#0891B2",
      sound: "default",
      enableLights: true,
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId as string | undefined,
    });
    const token = tokenData.data;
    const deviceId = Constants.deviceName ?? Constants.sessionId ?? "unknown";
    await api("/api/push-tokens", {
      method: "POST",
      body: {
        token,
        platform: Platform.OS as "ios" | "android",
        deviceId,
      },
    });
  } catch (e) {
    console.warn("Push token registration failed:", e);
  }
}

function handleNotificationNavigation(
  notification: Notifications.Notification | Notifications.NotificationResponse
) {
  const data =
    "notification" in notification
      ? notification.notification.request.content.data
      : notification.request.content.data;

  if (!data) return;
  const d = data as Record<string, string>;

  if (d.type === "call" && d.sessionId) {
    // Route incoming calls to the right call screen based on callee role
    const callPath = d.calleeRole === "secretary"
      ? "/(secretary)/call/[id]"
      : "/(doctor)/call/[id]";
    router.push({
      pathname: callPath as never,
      params: { id: d.sessionId, peerName: d.callerName ?? "Appel", role: "callee" },
    });
  } else if (d.type === "message" && d.conversationId) {
    router.push({
      pathname: "/(doctor)/chat/[id]" as never,
      params: {
        id: d.conversationId,
        kind: d.kind ?? "patient",
        peerName: d.peerName ?? "Conversation",
        peerId: d.peerId ?? "",
      },
    });
  } else if (d.type === "appointment" && d.appointmentId) {
    router.push({ pathname: "/(patient)/rendez-vous" as never });
  } else if (d.type === "patient_message" && d.conversationId) {
    router.push({
      pathname: "/(patient)/chat/[id]" as never,
      params: { id: d.conversationId },
    });
  } else if (d.type === "bell") {
    router.push({ pathname: "/(secretary)/dashboard" as never });
  }
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    const apiBase =
      (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      "http://localhost:3000";
    setApiBaseUrl(apiBase);

    loadMessages("fr", fr as Record<string, unknown>);
    loadMessages("ar", ar as Record<string, unknown>);
    setLocale("fr");

    setReady(true);

    // Register push token after API base is set
    void registerPushToken();

    if (!isExpoGo) {
      // Foreground notification: show banner but also handle navigation for calls
      notifListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          const d = notification.request.content.data as Record<string, string> | undefined;
          if (d?.type === "call") {
            handleNotificationNavigation(notification);
          }
        }
      );

      // User tapped a notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          handleNotificationNavigation(response);
        }
      );
    }

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
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
