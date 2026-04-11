/**
 * G10 — Clinic team agenda page
 *
 * Asserts:
 * 1. Without a ?id= param the page shows "Aucune clinique sélectionnée".
 * 2. The page always renders a date picker (input[type="date"]) regardless of
 *    clinic auth state — it is present before any API call.
 *
 * No seed data required — the no-id state is unconditional and the date input
 * is rendered in the initial component state.
 *
 * Note: with a valid clinic ID and auth the heading "Agenda équipe" would be
 * visible. That path requires a seeded clinic session.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("G10 — clinic agenda", () => {
  test("page without ?id param shows placeholder message", async ({ page }) => {
    await page.goto(`${BASE}/clinique/agenda`);
    await expect(page.getByText(/Aucune clinique sélectionnée/)).toBeVisible({
      timeout: 8000,
    });
  });

  test("date picker input is present on the agenda page", async ({ page }) => {
    await page.goto(`${BASE}/clinique/agenda`);
    // The date input is rendered regardless of auth/clinic state
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 8000 });
  });
});
