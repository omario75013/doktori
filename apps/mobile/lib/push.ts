import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0891B2",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data;
  } catch (e) {
    console.error("Failed to get push token:", e);
    return null;
  }
}

export async function registerPushTokenIfNeeded() {
  const token = await registerForPushNotifications();
  if (token) {
    const { api } = await import("./api");
    await api.registerPushToken(token).catch((e: any) =>
      console.error("Push token registration failed:", e)
    );
  }
}

export async function registerTokenWithServer(
  token: string,
  jwtToken: string,
  apiUrl: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceId: Device.modelName || "unknown",
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Register push token failed:", e);
    return false;
  }
}
