import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import fr from "@/i18n/fr.json";
import ar from "@/i18n/ar.json";

const i18n = new I18n({ fr, ar });
i18n.defaultLocale = "fr";
i18n.enableFallback = true;

// Dynamic import to avoid crash in Expo Go where native module may not exist
let _storage: any = null;
async function getStorage() {
  if (!_storage) {
    try {
      const mod = await import("@react-native-async-storage/async-storage");
      _storage = mod.default;
    } catch {
      _storage = null;
    }
  }
  return _storage;
}

export async function initLocale() {
  try {
    const storage = await getStorage();
    const saved = storage ? await storage.getItem("@doktori/locale") : null;
    if (saved) {
      i18n.locale = saved;
    } else {
      const deviceLocale = getLocales()[0]?.languageCode ?? "fr";
      i18n.locale = deviceLocale === "ar" ? "ar" : "fr";
    }
  } catch {
    const deviceLocale = getLocales()[0]?.languageCode ?? "fr";
    i18n.locale = deviceLocale === "ar" ? "ar" : "fr";
  }
  const isRtl = i18n.locale === "ar";
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.forceRTL(isRtl);
  }
}

export async function setLocale(locale: "fr" | "ar") {
  i18n.locale = locale;
  try {
    const storage = await getStorage();
    if (storage) await storage.setItem("@doktori/locale", locale);
  } catch {}
  const isRtl = locale === "ar";
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.forceRTL(isRtl);
  }
}

export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

export function currentLocale(): string {
  return i18n.locale;
}

export default i18n;
