/**
 * Template render engine with strict HTML escaping (BLOCKER B1).
 *
 * All variable values are HTML-escaped before interpolation to prevent XSS.
 */

import {
  TEMPLATE_VARIABLES,
  resolveVariable,
  type TemplateContext,
  type VariableFormat,
} from "./variables";

// ── HTML escaping (B1) ────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape a string for safe HTML insertion.
 * Converts &, <, >, ", ' to their HTML entity equivalents.
 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

// ── Locale helpers ────────────────────────────────────────────────────────────

function toLocaleTag(locale?: string): string {
  if (!locale) return "fr-TN";
  if (locale === "ar") return "ar-TN";
  if (locale === "fr") return "fr-TN";
  return locale;
}

// ── Value formatting ──────────────────────────────────────────────────────────

/**
 * Format a resolved value according to its declared format and the active locale.
 * Returns a string ready for HTML-escaping.
 */
export function formatValue(
  value: unknown,
  format: VariableFormat | undefined,
  locale: string
): string {
  if (value === null || value === undefined) return "";

  const tag = toLocaleTag(locale);

  if (value instanceof Date) {
    switch (format) {
      case "date_short":
        return new Intl.DateTimeFormat(tag, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(value);
      case "date_long":
        return new Intl.DateTimeFormat(tag, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(value);
      case "time":
        return new Intl.DateTimeFormat(tag, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(value);
      default:
        return value.toISOString();
    }
  }

  if (typeof value === "number") {
    return String(value);
  }

  // Arrays are pre-joined by resolveVariable (allergies) — handle residual array
  if (Array.isArray(value)) {
    const sep = locale === "ar" ? "، " : ", ";
    return value.filter(Boolean).join(sep);
  }

  return String(value);
}

// ── Render result ─────────────────────────────────────────────────────────────

export interface RenderResult {
  body: string;
  unresolved: string[];
}

// Regex matches {{word_chars}} placeholders
const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

/**
 * Interpolate all {{variable}} placeholders in a template string.
 *
 * - Known + resolved variable → HTML-escaped formatted value
 * - Known variable with null/undefined value → "___" + added to unresolved[]
 * - Unknown variable (not in registry) → left as-is {{name}}
 */
export function render(template: string, ctx: TemplateContext): RenderResult {
  const unresolved: string[] = [];
  const locale = ctx.locale ?? "fr";

  const body = template.replace(PLACEHOLDER_RE, (match, name: string) => {
    // Unknown variable — preserve the placeholder
    if (!(name in TEMPLATE_VARIABLES)) {
      return match;
    }

    const entry = TEMPLATE_VARIABLES[name];
    const value = resolveVariable(name, ctx);

    if (value === null || value === undefined) {
      unresolved.push(name);
      return "___";
    }

    const formatted = formatValue(value, entry?.format, locale);
    return escapeHtml(formatted);
  });

  return { body, unresolved };
}
