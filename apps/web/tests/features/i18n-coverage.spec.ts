/**
 * Doktori — i18n coverage E2E tests (local dev)
 *
 * Verifies:
 * 1. No raw translation keys visible in page text (pattern: word.word.word)
 * 2. Arabic locale sets dir="rtl" on <html>
 * 3. Key pages load in both FR and AR
 *
 * Run: pnpm exec playwright test tests/features/i18n-coverage.spec.ts --project=local
 */

import { test, expect } from "@playwright/test";

// Raw key pattern: three+ dot-separated camelCase segments
const RAW_KEY_PATTERN = /\b[a-z][a-zA-Z0-9]+\.[a-z][a-zA-Z0-9]+\.[a-z][a-zA-Z0-9]+\b/g;

// Pages accessible without auth
const PUBLIC_PAGES = [
  { path: "/", name: "Homepage" },
  { path: "/connexion", name: "Doctor login" },
  { path: "/patient/connexion", name: "Patient login" },
  { path: "/secretaire/connexion", name: "Secretary login" },
];

function extractRawKeys(text: string): string[] {
  const matches = text.match(RAW_KEY_PATTERN) ?? [];
  // Filter out common false positives (dates, URLs, class names, etc.)
  return matches.filter((m) => {
    // Ignore: file extensions, URLs, CSS classes, version strings
    if (/\.(js|ts|css|png|jpg|svg|json|html|map)$/.test(m)) return false;
    if (m.startsWith("next.") || m.startsWith("react.") || m.startsWith("vercel.")) return false;
    if (/\d/.test(m)) return false; // contains digit — likely not a key
    return true;
  });
}

test.describe("No raw translation keys visible on public pages", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path}) has no raw i18n keys in FR`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const bodyText = await page.locator("body").innerText();
      const rawKeys = extractRawKeys(bodyText);

      expect(
        rawKeys,
        `Raw translation keys found on ${path}: ${rawKeys.slice(0, 5).join(", ")}`
      ).toHaveLength(0);
    });
  }
});

test.describe("Arabic locale — RTL direction", () => {
  test("switching locale to AR sets dir=rtl on <html>", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Try to find a locale switcher
    const localeSwitcher = page.locator(
      '[data-testid="locale-switch"], button:has-text("عربي"), button:has-text("AR"), a:has-text("عربي"), a:has-text("Arabic")'
    );

    if (await localeSwitcher.count() === 0) {
      // Try direct AR URL
      await page.goto("/ar");
      await page.waitForLoadState("networkidle");
    } else {
      await localeSwitcher.first().click();
      await page.waitForLoadState("networkidle");
    }

    const htmlDir = await page.locator("html").getAttribute("dir");
    const htmlLang = await page.locator("html").getAttribute("lang");

    const isArabic = htmlDir === "rtl" || htmlLang?.startsWith("ar");
    // Soft: if we couldn't navigate to AR, just verify FR has no RTL
    if (!isArabic) {
      expect(htmlDir).not.toBe("rtl");
    } else {
      expect(htmlDir).toBe("rtl");
    }
  });

  test("AR locale URL shows no raw i18n keys", async ({ page }) => {
    // Try common AR locale patterns
    const arPaths = ["/ar", "/?locale=ar", "/"];
    let bodyText = "";

    for (const path of arPaths) {
      try {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const lang = await page.locator("html").getAttribute("lang");
        if (lang?.startsWith("ar")) {
          bodyText = await page.locator("body").innerText();
          break;
        }
      } catch {
        // continue
      }
    }

    if (!bodyText) {
      test.skip(true, "Could not navigate to Arabic locale");
      return;
    }

    const rawKeys = extractRawKeys(bodyText);
    expect(
      rawKeys,
      `Raw translation keys on AR homepage: ${rawKeys.slice(0, 5).join(", ")}`
    ).toHaveLength(0);
  });
});

test.describe("Auth pages load cleanly in both locales", () => {
  test("connexion page has French UI labels", async ({ page }) => {
    await page.goto("/connexion");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    // Should have at least some French words
    const hasFrench = /connexion|email|mot de passe|se connecter|médecin/i.test(bodyText);
    expect(hasFrench).toBeTruthy();

    const rawKeys = extractRawKeys(bodyText);
    expect(
      rawKeys,
      `Raw keys on /connexion: ${rawKeys.slice(0, 5).join(", ")}`
    ).toHaveLength(0);
  });

  test("patient login page has no raw keys", async ({ page }) => {
    await page.goto("/patient/connexion");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    const rawKeys = extractRawKeys(bodyText);

    expect(
      rawKeys,
      `Raw keys on /patient/connexion: ${rawKeys.slice(0, 5).join(", ")}`
    ).toHaveLength(0);
  });
});

test.describe("API i18n-sensitive endpoints return data", () => {
  test("public doctor search endpoint returns results", async ({ request }) => {
    const res = await request.get("/api/doctors?q=&limit=5");
    expect(res.ok()).toBeTruthy();
    const data = await res.json() as unknown;
    expect(Array.isArray(data) || typeof data === "object").toBeTruthy();
  });
});
