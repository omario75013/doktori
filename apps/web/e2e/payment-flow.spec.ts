import { test, expect } from "@playwright/test";

/**
 * Flouci Payment Flow E2E Tests
 *
 * These tests verify the payment infrastructure works correctly in dev mode
 * (mock payments). When FLOUCI_APP_TOKEN is set on prod, the mock mode is
 * bypassed and real Flouci API calls are made.
 *
 * Prerequisites for real payments:
 * - FLOUCI_APP_TOKEN in .env
 * - FLOUCI_APP_SECRET in .env
 * - Flouci merchant account verified
 */

test.describe("Payment Infrastructure", () => {
  test("billing plans API returns valid plans", async ({ request }) => {
    const res = await request.get("/api/billing/plans");
    expect(res.status()).toBe(200);

    const plans = await res.json();
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThanOrEqual(2);

    // Check plan structure
    const essentiel = plans.find((p: any) => p.id === "essentiel");
    const pro = plans.find((p: any) => p.id === "pro");

    expect(essentiel).toBeDefined();
    expect(essentiel.priceMillimes).toBe(49000);
    expect(essentiel.features.length).toBeGreaterThan(5);

    expect(pro).toBeDefined();
    expect(pro.priceMillimes).toBe(99000);
    expect(pro.features.length).toBeGreaterThan(8);
    expect(pro.teleconsultNote).toBeTruthy();
  });

  test("checkout API requires authentication", async ({ request }) => {
    const res = await request.post("/api/billing/checkout", {
      data: { plan: "essentiel", provider: "flouci" },
    });
    // Should return 401 since we're not logged in
    expect(res.status()).toBe(401);
  });

  test("subscription page renders for unauthenticated users", async ({ page }) => {
    // The /abonnement page is behind doctor auth, should redirect
    await page.goto("/abonnement");
    // Should redirect to /connexion
    await page.waitForURL(/connexion/);
    expect(page.url()).toContain("connexion");
  });

  test("payment success page handles simulated ref", async ({ page }) => {
    await page.goto("/payment/success?ref=DEV-test-123&simulated=true");
    await page.waitForLoadState("networkidle");
    // Page should load without errors
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("payment fail page loads", async ({ page }) => {
    await page.goto("/payment/fail");
    await page.waitForLoadState("networkidle");
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe("Wallet Infrastructure", () => {
  test("wallet API requires doctor auth", async ({ request }) => {
    const res = await request.get("/api/doctor/wallet");
    expect(res.status()).toBe(401);
  });
});
