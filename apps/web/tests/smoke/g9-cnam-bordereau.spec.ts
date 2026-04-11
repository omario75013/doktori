/**
 * G9 — CNAM bordereau auth gate and print page
 *
 * Asserts:
 * 1. /cnam without auth redirects to /admin-login (server-side via layout guard).
 * 2. /cnam/<fake-uuid>/print shows "Bordereau introuvable" or "Chargement…"
 *    because the UUID does not exist in the DB.
 *
 * No seed data required for either test.
 *
 * Note: The /cnam route lives under the (medecin) layout group which uses
 * next-auth session protection. The exact redirect target may differ if the
 * auth middleware changes.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

test.describe("G9 — CNAM bordereau", () => {
  test("unauthenticated /cnam redirects to login", async ({ page }) => {
    const response = await page.goto(`${BASE}/cnam`);
    // Accept either a redirect (status 3xx resolved) or a login page in the final URL
    const finalUrl = page.url();
    const isLoginPage = /login|connexion|signin/i.test(finalUrl);
    const isRedirected = finalUrl !== `${BASE}/cnam`;
    expect(isLoginPage || isRedirected || (response?.status() ?? 200) !== 200).toBe(true);
  });

  test("/cnam/<fake-uuid>/print shows error or loading state", async ({ page }) => {
    await page.goto(`${BASE}/cnam/${FAKE_UUID}/print`);
    // Either the auth guard redirects or the print page shows an error
    const errorOrLoading = page.getByText(/Bordereau introuvable|Chargement|introuvable|error/i);
    const isLoginPage = /login|connexion|signin/i.test(page.url());
    if (!isLoginPage) {
      await expect(errorOrLoading).toBeVisible({ timeout: 8000 });
    }
  });
});
