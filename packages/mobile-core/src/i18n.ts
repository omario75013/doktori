/**
 * Minimal i18n surface for mobile.
 * Public API: t(), setLocale(), getLocale(), isRtl(), useLocale(), changeLocale()
 */

import { useState, useEffect } from "react";
import { I18nManager } from "react-native";
import * as SecureStore from "expo-secure-store";

type Dict = Record<string, unknown>;
export type Locale = "fr" | "ar";

const LOCALE_KEY = "doktori.locale";
const dictionaries: Record<Locale, Dict> = { fr: {}, ar: {} };
let activeLocale: Locale = "fr";

// Subscribers notified when locale changes (React hooks register here)
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => cb());
}

export function setLocale(locale: Locale): void {
  activeLocale = locale;
  notify();
}

export function getLocale(): Locale {
  return activeLocale;
}

export function isRtl(): boolean {
  return activeLocale === "ar";
}

export function loadMessages(locale: Locale, messages: Dict): void {
  dictionaries[locale] = messages;
}

/** Persist + apply a locale change at runtime. */
export async function changeLocale(locale: Locale): Promise<void> {
  try {
    await SecureStore.setItemAsync(LOCALE_KEY, locale);
  } catch {
    /* storage unavailable — still apply in-memory */
  }
  const needsRtlFlip = locale === "ar" !== I18nManager.isRTL;
  if (needsRtlFlip) {
    I18nManager.forceRTL(locale === "ar");
    // Full RTL flip requires a reload — caller should trigger Updates.reloadAsync()
  }
  setLocale(locale);
}

/** Load persisted locale on app boot (call in root _layout before setReady). */
export async function loadPersistedLocale(): Promise<Locale> {
  try {
    const saved = await SecureStore.getItemAsync(LOCALE_KEY);
    if (saved === "fr" || saved === "ar") {
      activeLocale = saved;
      if (saved === "ar" && !I18nManager.isRTL) {
        I18nManager.forceRTL(true);
      } else if (saved === "fr" && I18nManager.isRTL) {
        I18nManager.forceRTL(false);
      }
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "fr";
}

function resolve(key: string, dict: Dict): unknown {
  return key.split(".").reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === "object" && seg in (acc as Dict)) {
      return (acc as Dict)[seg];
    }
    return undefined;
  }, dict);
}

/** Returns an array value from the i18n dictionary (for keys whose JSON value is an array). */
export function tArray(key: string): string[] {
  const dict = dictionaries[activeLocale];
  const hit = resolve(key, dict);
  if (Array.isArray(hit)) return hit as string[];
  const frHit = resolve(key, dictionaries.fr);
  if (Array.isArray(frHit)) return frHit as string[];
  return [];
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[activeLocale];
  const hit = resolve(key, dict);
  const template =
    typeof hit === "string"
      ? hit
      : typeof resolve(key, dictionaries.fr) === "string"
      ? (resolve(key, dictionaries.fr) as string)
      : key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

/** React hook — re-renders component whenever locale changes. */
export function useLocale(): { locale: Locale; changeLocale: (l: Locale) => Promise<void>; isRtl: boolean } {
  const [locale, setLocaleState] = useState<Locale>(activeLocale);

  useEffect(() => {
    const handler = () => setLocaleState(activeLocale);
    subscribers.add(handler);
    return () => { subscribers.delete(handler); };
  }, []);

  return { locale, changeLocale, isRtl: locale === "ar" };
}
