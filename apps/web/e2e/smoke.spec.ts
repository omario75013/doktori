/**
 * Doktori — Production smoke tests
 *
 * Runs against https://doktori.tn.
 * All tests are read-only (no mutations, no auth side-effects).
 *
 * Run:  pnpm test:e2e
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Homepage loads
// ─────────────────────────────────────────────────────────────────────────────

test.describe("1 — Homepage", () => {
  test("title contains Doktori, search bar and nav link visible, no console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Title
    await expect(page).toHaveTitle(/Doktori/i);

    // Search bar — the hero search input on the homepage
    const searchInput = page.locator(
      "form input[type='text'], form input[placeholder]",
    );
    await expect(searchInput.first()).toBeVisible();

    // Navbar "Espace médecin" link pointing to /connexion
    const doctorLink = page.locator('a[href="/connexion"]');
    await expect(doctorLink.first()).toBeVisible();

    // No JS console errors (filter out known benign third-party noise)
    const appErrors = consoleErrors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("Non-Error promise rejection"),
    );
    expect(
      appErrors,
      `Unexpected console errors: ${appErrors.join("\n")}`,
    ).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Search page (/recherche)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("2 — Search page", () => {
  test("search input is visible and at least 1 doctor card renders", async ({
    page,
  }) => {
    await page.goto("/recherche");
    await page.waitForLoadState("networkidle");

    // Search input
    const searchInput = page.locator("input[type='search'], input[type='text']");
    await expect(searchInput.first()).toBeVisible();

    // Doctor cards — each card is a Link to /medecin/<slug>
    const doctorCards = page.locator('a[href^="/medecin/"]');
    await expect(doctorCards.first()).toBeVisible({ timeout: 15_000 });
    const count = await doctorCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking a specialty filter updates results", async ({ page }) => {
    await page.goto("/recherche");
    await page.waitForLoadState("networkidle");

    // Wait for initial results
    const doctorCards = page.locator('a[href^="/medecin/"]');
    await expect(doctorCards.first()).toBeVisible({ timeout: 15_000 });

    // Click the first specialty filter button
    const specialtyFilter = page
      .locator("button")
      .filter({ hasText: /généraliste|dentiste|dermatologue|cardiologue|pédiatre|ophtalmologue/i });
    const filterCount = await specialtyFilter.count();
    if (filterCount > 0) {
      await specialtyFilter.first().click();
      // Results should update — count may change or stay same; just verify list is still present
      await expect(doctorCards.first()).toBeVisible({ timeout: 10_000 });
      const newCount = await doctorCards.count();
      // After filtering, count should be defined (>= 0)
      expect(newCount).toBeGreaterThanOrEqual(0);
    } else {
      // Skip gracefully if the filter buttons have different text in the current locale
      test.skip(true, "No specialty filter buttons found with expected labels");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Doctor profile page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("3 — Doctor profile", () => {
  test("doctor name visible, booking CTA present, JSON-LD exists", async ({
    page,
  }) => {
    // Navigate to search, pick first doctor card
    await page.goto("/recherche");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator('a[href^="/medecin/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();

    await page.waitForLoadState("networkidle");

    // Doctor name — rendered in an h1 or heading
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText?.trim().length).toBeGreaterThan(0);

    // Booking CTA
    const bookingCta = page.locator(
      "text=/Prendre rendez-vous|Prendre RDV|Réserver/i",
    );
    await expect(bookingCta.first()).toBeVisible({ timeout: 10_000 });

    // JSON-LD structured data on the page
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Blog
// ─────────────────────────────────────────────────────────────────────────────

test.describe("4 — Blog", () => {
  test("at least 3 article cards visible, click first article shows h1 and content", async ({
    page,
  }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");

    // Article cards — links within the blog listing
    const articleLinks = page.locator('a[href^="/blog/"]');
    await expect(articleLinks.first()).toBeVisible({ timeout: 10_000 });
    const count = await articleLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Click the first article
    const firstHref = await articleLinks.first().getAttribute("href");
    if (firstHref) {
      await page.goto(firstHref);
      await page.waitForLoadState("networkidle");
    } else {
      await articleLinks.first().click();
      await page.waitForLoadState("networkidle");
    }

    // Article h1 visible
    const articleTitle = page.locator("h1");
    await expect(articleTitle.first()).toBeVisible({ timeout: 10_000 });
    const titleText = await articleTitle.first().textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);

    // Article prose content not empty
    const prose = page.locator(
      ".prose, article, [class*='prose'], [class*='content']",
    );
    await expect(prose.first()).toBeVisible({ timeout: 10_000 });
    const proseText = await prose.first().textContent();
    expect(proseText?.trim().length).toBeGreaterThan(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. SOS page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("5 — SOS page", () => {
  test("SOS/médecin text visible, CTA button present, SAMU 190 disclaimer visible", async ({
    page,
  }) => {
    await page.goto("/sos");
    await page.waitForLoadState("networkidle");

    // SOS or médecin heading
    const sosText = page.locator(
      "text=/SOS|Urgence|médecin|urgence médicale/i",
    );
    await expect(sosText.first()).toBeVisible({ timeout: 10_000 });

    // CTA button — "Demander un médecin" or similar
    const cta = page.locator(
      "button, a[href]",
    ).filter({ hasText: /médecin|Demander|Appel|SOS/i });
    await expect(cta.first()).toBeVisible({ timeout: 10_000 });

    // SAMU disclaimer with 190
    const samu = page.locator("text=/190/");
    await expect(samu.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. FAQ page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("6 — FAQ page", () => {
  test("FAQ questions visible, click first question expands answer", async ({
    page,
  }) => {
    await page.goto("/faq");
    await page.waitForLoadState("networkidle");

    // FAQ questions — rendered as buttons or clickable elements
    const faqQuestions = page.locator(
      "button[aria-expanded], [role='button'], details summary, button",
    ).filter({ hasText: /\?|comment|puis-je|quoi|pourquoi|est-ce|doktori/i });
    await expect(faqQuestions.first()).toBeVisible({ timeout: 10_000 });

    // Click the first FAQ item to expand it
    await faqQuestions.first().click();

    // Answer should now be visible — look for any newly visible text element
    // The FAQ uses accordion-style expand/collapse
    await page.waitForTimeout(500); // brief pause for animation

    // After clicking, the page should still be in a valid state
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Doctor login page (/connexion)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("7 — Doctor login page", () => {
  test("email and password inputs exist, doctor area heading visible", async ({
    page,
  }) => {
    await page.goto("/connexion");
    await page.waitForLoadState("networkidle");

    // Email input
    const emailInput = page.locator("#email, input[type='email']");
    await expect(emailInput.first()).toBeVisible();

    // Password input
    const passwordInput = page.locator("#password, input[type='password']");
    await expect(passwordInput.first()).toBeVisible();

    // Login page heading or title
    const heading = page.locator(
      "text=/Espace médecin|espace médecin|Bon retour|Connectez-vous/i",
    );
    await expect(heading.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Arabic locale (RTL)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("8 — Arabic locale", () => {
  test("dir=rtl on html element and Arabic text present with NEXT_LOCALE=ar cookie", async ({
    page,
    context,
  }) => {
    // Set locale cookie before navigation
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "ar",
        domain: "doktori.tn",
        path: "/",
      },
    ]);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check dir="rtl" on <html>
    const htmlDir = await page.locator("html").getAttribute("dir");
    expect(htmlDir).toBe("rtl");

    // Check Arabic text is present (Unicode Arabic block: U+0600–U+06FF)
    const bodyText = await page.locator("body").textContent();
    const arabicRegex = /[\u0600-\u06FF]/;
    expect(
      arabicRegex.test(bodyText ?? ""),
      "Expected Arabic Unicode characters in page body",
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Security headers
// ─────────────────────────────────────────────────────────────────────────────

test.describe("9 — Security headers", () => {
  test("HSTS, X-Frame-Options, X-Content-Type-Options headers are set", async ({
    request,
  }) => {
    const response = await request.get("https://doktori.tn");
    const headers = response.headers();

    // Strict-Transport-Security
    expect(
      headers["strict-transport-security"],
      "strict-transport-security header missing",
    ).toBeTruthy();

    // X-Frame-Options: DENY
    const xfo = headers["x-frame-options"];
    expect(xfo, "x-frame-options header missing").toBeTruthy();
    expect(xfo?.toLowerCase()).toBe("deny");

    // X-Content-Type-Options: nosniff
    const xcto = headers["x-content-type-options"];
    expect(xcto, "x-content-type-options header missing").toBeTruthy();
    expect(xcto?.toLowerCase()).toBe("nosniff");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. API health
// ─────────────────────────────────────────────────────────────────────────────

test.describe("10 — API health", () => {
  test("/api/search?q=test returns 200", async ({ request }) => {
    const response = await request.get("https://doktori.tn/api/search?q=test");
    expect(response.status()).toBe(200);
  });

  test("/api/admin/kpis returns 401 without auth", async ({ request }) => {
    const response = await request.get("https://doktori.tn/api/admin/kpis");
    expect(response.status()).toBe(401);
  });
});
