import { Platform } from "react-native";
import Constants from "expo-constants";
import { getToken } from "./auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const APP_VERSION = Constants.expoConfig?.version || "unknown";
const BUILD =
  Constants.expoConfig?.ios?.buildNumber ||
  String(Constants.expoConfig?.android?.versionCode ?? "0");

type EventName =
  | "app_open"
  | "app_background"
  | "search"
  | "doctor_view"
  | "booking_start"
  | "booking_complete"
  | "teleconsult_join"
  | "sos_request"
  | "review_submit"
  | "login"
  | "logout";

interface EventData {
  [key: string]: string | number | boolean | null;
}

export async function trackEvent(
  name: EventName,
  data?: EventData
): Promise<void> {
  try {
    const token = await getToken();
    await fetch(`${API_URL}/api/analytics/mobile-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event: name,
        platform: Platform.OS,
        appVersion: APP_VERSION,
        buildNumber: BUILD,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    });
  } catch {
    // Fire and forget — never block the UI for analytics
  }
}
