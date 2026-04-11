/**
 * G1 — Reminder token error UI
 *
 * Asserts: invalid reminder tokens render an error state with "Lien invalide"
 * or a generic error message from the API.
 *
 * No seed data required — these tokens will always be rejected by the API,
 * exercising the error branch in /app/r/[token]/page.tsx.
 *
 * Full happy-path (confirm/cancel) requires a real appointment token from the DB.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("G1 — reminder token error UI", () => {
  test("short bad token /r/bad-token shows error state", async ({ page }) => {
    await page.goto(`${BASE}/r/bad-token`);
    // Page renders the card, then fetches the API. Wait for the error view.
    await expect(
      page.getByText(/Lien invalide|invalide|introuvable|error/i),
    ).toBeVisible({ timeout: 8000 });
  });

  test("dotted bad token /r/test.abc shows error state", async ({ page }) => {
    await page.goto(`${BASE}/r/test.abc`);
    await expect(
      page.getByText(/Lien invalide|invalide|introuvable|error/i),
    ).toBeVisible({ timeout: 8000 });
  });
});
