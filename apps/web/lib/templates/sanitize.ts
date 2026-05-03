/**
 * Server-side markdown sanitization and pre-flight validation.
 *
 * sanitizeMarkdown  — strips dangerous HTML from markdown content (script, iframe, on*)
 * validateMarkdown  — cheap pre-flight checks (size, empty, known-bad patterns)
 */

import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

// ── Forbidden patterns for fast pre-flight check ──────────────────────────────

const FORBIDDEN_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /<\/script>/i,
  /<iframe[\s>]/i,
  /<\/iframe>/i,
  /\bon\w+\s*=/i,          // onclick=, onerror=, onload=, etc.
  /javascript\s*:/i,        // javascript: protocol in links
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<link[\s>]/i,
  /<base[\s>]/i,
  /data\s*:/i,              // data: URIs
];

// ── Sanitize pipeline ─────────────────────────────────────────────────────────

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, {
    ...defaultSchema,
    // Strip all on* attributes
    attributes: {
      ...defaultSchema.attributes,
      "*": (defaultSchema.attributes?.["*"] ?? []).filter(
        (attr) => typeof attr !== "string" || !attr.startsWith("on")
      ),
    },
  })
  .use(rehypeStringify);

/**
 * Parse input as HTML fragment, run rehype-sanitize, and return sanitized HTML.
 * Strips script, iframe, on* event handlers and other dangerous content.
 */
export function sanitizeMarkdown(input: string): string {
  const result = processor.processSync(input);
  return String(result);
}

// ── Validation result type ────────────────────────────────────────────────────

export type ValidationOk = { ok: true };
export type ValidationError = {
  ok: false;
  error: "BODY_REQUIRED" | "BODY_TOO_LARGE" | "UNSAFE_MARKDOWN";
};
export type ValidationResult = ValidationOk | ValidationError;

const MAX_BODY_BYTES = 10 * 1024; // 10 KB

/**
 * Cheap pre-flight validation — no HTML parsing involved.
 * Returns { ok: true } when the content passes all checks.
 */
export function validateMarkdown(body: string): ValidationResult {
  if (!body || body.trim().length === 0) {
    return { ok: false, error: "BODY_REQUIRED" };
  }

  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    return { ok: false, error: "BODY_TOO_LARGE" };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(body)) {
      return { ok: false, error: "UNSAFE_MARKDOWN" };
    }
  }

  return { ok: true };
}
