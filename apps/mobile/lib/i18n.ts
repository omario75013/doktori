import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import fr from "@/i18n/fr.json";
import ar from "@/i18n/ar.json";

const i18n = new I18n({ fr, ar });
i18n.defaultLocale = "fr";
i18n.enableFallback = true;

export async function initLocale() {
  const saved = await AsyncStorage.getItem("@doktori/locale");
  if (saved) {
    i18n.locale = saved;
  } else {
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
  await AsyncStorage.setItem("@doktori/locale", locale);
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
