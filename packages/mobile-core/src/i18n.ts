/**
 * Minimal i18n surface for mobile. Translations are loaded from bundled JSON
 * (copied from apps/web/i18n/messages/{fr,ar}.json on prebuild). We keep the
 * public API small: `t("path.to.key", vars?)` + `setLocale("fr" | "ar")`.
 *
 * No dependency on react-intl or i18next — both have native-module surface
 * areas we don't need. This lookup handles the 95% case and leaves room to
 * swap in a richer engine later.
 */

type Dict = Record<string, unknown>;
type Locale = "fr" | "ar";

const dictionaries: Record<Locale, Dict> = { fr: {}, ar: {} };
let activeLocale: Locale = "fr";

export function setLocale(locale: Locale): void {
  activeLocale = locale;
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

function resolve(key: string, dict: Dict): unknown {
  return key.split(".").reduce<unknown>((acc, seg) => {
    if (acc && typeof acc === "object" && seg in (acc as Dict)) {
      return (acc as Dict)[seg];
    }
    return undefined;
  }, dict);
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
