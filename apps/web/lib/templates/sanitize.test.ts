import { describe, it, expect } from "vitest";
import { sanitizeMarkdown, validateMarkdown } from "./sanitize";

// ── W1.8-T1: sanitizeMarkdown — safe markdown preserved ──────────────────────

describe("sanitizeMarkdown", () => {
  it("preserves safe markdown heading", () => {
    const input = "# Mon titre";
    const result = sanitizeMarkdown(input);
    expect(result).toContain("Mon titre");
  });

  it("preserves bold text", () => {
    const input = "**texte important**";
    const result = sanitizeMarkdown(input);
    expect(result).toContain("texte important");
  });

  it("strips <script> tag", () => {
    const input = "Bonjour <script>alert(1)</script> monde";
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert(1)");
  });

  it("strips <iframe> tag", () => {
    const input = 'Avant <iframe src="evil.com"></iframe> Après';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("<iframe");
    expect(result).not.toContain("evil.com");
  });

  it("strips onclick event handler", () => {
    const input = '<div onclick="alert(1)">click me</div>';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("alert(1)");
  });

  it("strips onerror event handler", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("onerror");
  });

  it("strips onload event handler", () => {
    const input = '<body onload="evil()"></body>';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain("onload");
  });

  it("returns a string", () => {
    expect(typeof sanitizeMarkdown("hello")).toBe("string");
  });
});

// ── W1.8-T2: validateMarkdown — accepts safe input ───────────────────────────

describe("validateMarkdown", () => {
  it("accepts safe input and returns ok: true", () => {
    const result = validateMarkdown("# Titre\n\n**gras** et *italique*");
    expect(result.ok).toBe(true);
  });

  it("returns error BODY_REQUIRED for empty string", () => {
    const result = validateMarkdown("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("BODY_REQUIRED");
    }
  });

  it("returns error BODY_REQUIRED for whitespace-only string", () => {
    const result = validateMarkdown("   \n  ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("BODY_REQUIRED");
    }
  });

  it("returns error BODY_TOO_LARGE for input > 10KB", () => {
    const big = "a".repeat(10 * 1024 + 1);
    const result = validateMarkdown(big);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("BODY_TOO_LARGE");
    }
  });

  it("accepts input exactly at 10KB boundary", () => {
    const exactly10k = "a".repeat(10 * 1024);
    const result = validateMarkdown(exactly10k);
    expect(result.ok).toBe(true);
  });

  it("returns error UNSAFE_MARKDOWN for <script> tag", () => {
    const result = validateMarkdown("<script>alert(1)</script>");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("UNSAFE_MARKDOWN");
    }
  });

  it("returns error UNSAFE_MARKDOWN for <iframe> tag", () => {
    const result = validateMarkdown('<iframe src="evil.com"></iframe>');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("UNSAFE_MARKDOWN");
    }
  });

  it("returns error UNSAFE_MARKDOWN for javascript: protocol", () => {
    const result = validateMarkdown('[click me](javascript:alert(1))');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("UNSAFE_MARKDOWN");
    }
  });

  it("returns error UNSAFE_MARKDOWN for on* event handler", () => {
    const result = validateMarkdown('<div onclick="evil()">x</div>');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("UNSAFE_MARKDOWN");
    }
  });
});
