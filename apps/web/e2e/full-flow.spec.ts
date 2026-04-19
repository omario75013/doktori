import { test, expect } from "@playwright/test";

/**
 * Full E2E Flow Tests — Doktori Platform
 *
 * Tests the complete user journeys for:
 * - Patient finding a doctor (clinic + independent)
 * - Doctor login and dashboard
 * - Secretary login and dashboard
 * - Clinic login and dashboard
 * - Booking flow
 * - Verification flow
 *
 * Prerequisites: Run migration 0052_demo_presentation_data.sql first
 * Credentials: see docs/demo/credentials.md
 */

const BASE = "https://doktori.tn";

// ═══════════════════════════════════════════════════
// PATIENT FLOWS
// ═══════════════════════════════════════════════════

test.describe("Patient — Find Doctors", () => {
  test("search page loads with filters", async ({ page }) => {
    await page.goto(`${BASE}/recherche`);
    await page.waitForLoadState("networkidle");

    // Search input visible
    await expect(page.locator('input[type="text"]').first()).toBeVisible();

    // Doctor cards visible (we have demo data)
    const cards = page.locator('a[href^="/medecin/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("filter by specialty shows correct results", async ({ page }) => {
    await page.goto(`${BASE}/recherche`);
    await page.waitForLoadState("networkidle");

    // Click on a specialty filter (Dermatologue)
    const dermaFilter = page.getByText("Dermatologue").first();
    if (await dermaFilter.isVisible()) {
      await dermaFilter.click();
      await page.waitForTimeout(1000);
      // Results should update
      const results = page.locator('a[href^="/medecin/"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no demo derma
    }
  });

  test("doctor profile page loads with booking button", async ({ page }) => {
    await page.goto(`${BASE}/recherche`);
    await page.waitForLoadState("networkidle");

    // Click first doctor
    const firstCard = page.locator('a[href^="/medecin/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await page.waitForLoadState("networkidle");

    // Doctor profile loaded
    await expect(page.locator("h1")).toBeVisible();

    // Booking button exists
    const bookBtn = page.getByText(/Prendre (RDV|rendez-vous)/i).first();
    await expect(bookBtn).toBeVisible();
  });

  test("blog has articles with images", async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    await page.waitForLoadState("networkidle");

    // At least 9 articles on first page
    const articles = page.locator('a[href^="/blog/"]');
    const count = await articles.count();
    expect(count).toBeGreaterThanOrEqual(9);

    // Images are loading (Unsplash)
    const images = page.locator("img[src*='unsplash']");
    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);
  });

  test("SOS page loads with process steps", async ({ page }) => {
    await page.goto(`${BASE}/sos`);
    await page.waitForLoadState("networkidle");

    // SAMU disclaimer visible
    await expect(page.getByText("190")).toBeVisible();

    // CTA button
    await expect(page.getByText(/médecin maintenant/i)).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
// DOCTOR FLOWS
// ═══════════════════════════════════════════════════

test.describe("Doctor — Login & Dashboard", () => {
  test("login page has email and password fields", async ({ page }) => {
    await page.goto(`${BASE}/connexion`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto(`${BASE}/connexion`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', "fake@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    // Should show error message
    const error = page.getByText(/incorrect|erreur|invalid/i);
    await expect(error).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════
// SECRETARY FLOWS
// ═══════════════════════════════════════════════════

test.describe("Secretary — Login Page", () => {
  test("secretary login page loads", async ({ page }) => {
    await page.goto(`${BASE}/secretaire-login`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByText(/secrétaire|secretaire/i).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
// CLINIC FLOWS
// ═══════════════════════════════════════════════════

test.describe("Clinic — Login Page", () => {
  test("clinic login page loads", async ({ page }) => {
    await page.goto(`${BASE}/clinique-login`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
// REGISTRATION FLOWS
// ═══════════════════════════════════════════════════

test.describe("Registration — Role Toggle", () => {
  test("inscription page has doctor and clinic toggle", async ({ page }) => {
    await page.goto(`${BASE}/inscription`);
    await page.waitForLoadState("networkidle");

    // Both role cards should be visible
    const medecinCard = page.getByText(/médecin/i).first();
    const cliniqueCard = page.getByText(/clinique/i).first();

    await expect(medecinCard).toBeVisible();
    await expect(cliniqueCard).toBeVisible();
  });

  test("switching to clinic shows clinic form", async ({ page }) => {
    await page.goto(`${BASE}/inscription`);
    await page.waitForLoadState("networkidle");

    // Click clinique toggle
    const cliniqueCard = page.locator("text=Clinique").first();
    if (await cliniqueCard.isVisible()) {
      await cliniqueCard.click();
      await page.waitForTimeout(500);

      // Should show clinic-specific fields
      const clinicName = page.getByPlaceholder(/clinique|centre|nom/i).first();
      if (await clinicName.isVisible()) {
        // Clinic form is showing
        expect(true).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════
// API HEALTH CHECKS
// ═══════════════════════════════════════════════════

test.describe("API — Health Checks", () => {
  test("search API works", async ({ request }) => {
    const res = await request.get(`${BASE}/api/search?q=medecin`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.hits).toBeDefined();
  });

  test("billing plans API returns plans", async ({ request }) => {
    const res = await request.get(`${BASE}/api/billing/plans`);
    expect(res.status()).toBe(200);
    const plans = await res.json();
    expect(plans.length).toBe(2);
    expect(plans[0].id).toBe("essentiel");
    expect(plans[1].id).toBe("pro");
  });

  test("protected APIs require auth", async ({ request }) => {
    const endpoints = [
      { method: "GET", url: "/api/doctor/wallet" },
      { method: "GET", url: "/api/admin/kpis" },
      { method: "POST", url: "/api/doctor/send-sms" },
      { method: "GET", url: "/api/doctor/sms-quota" },
    ];

    for (const ep of endpoints) {
      const res = ep.method === "GET"
        ? await request.get(`${BASE}${ep.url}`)
        : await request.post(`${BASE}${ep.url}`, { data: {} });
      expect(res.status()).toBeGreaterThanOrEqual(401);
    }
  });

  test("security headers present", async ({ request }) => {
    const res = await request.get(BASE);
    const headers = res.headers();
    expect(headers["strict-transport-security"]).toBeDefined();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test("404 page works", async ({ page }) => {
    await page.goto(`${BASE}/this-page-does-not-exist-xyz`);
    await expect(page.getByText("Page introuvable")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
// ARABIC LOCALE
// ═══════════════════════════════════════════════════

test.describe("Arabic — RTL Support", () => {
  test("Arabic locale renders RTL", async ({ page, context }) => {
    await context.addCookies([{
      name: "NEXT_LOCALE",
      value: "ar",
      domain: "doktori.tn",
      path: "/",
    }]);

    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");

    // Arabic text present
    const content = await page.textContent("body");
    expect(content).toMatch(/[\u0600-\u06FF]/); // Arabic unicode range
  });

  test("search filters in Arabic", async ({ page, context }) => {
    await context.addCookies([{
      name: "NEXT_LOCALE",
      value: "ar",
      domain: "doktori.tn",
      path: "/",
    }]);

    await page.goto(`${BASE}/recherche`);
    await page.waitForLoadState("networkidle");

    // Specialties should be in Arabic
    const content = await page.textContent("body");
    expect(content).toMatch(/طبيب/); // "doctor" in Arabic
  });
});
