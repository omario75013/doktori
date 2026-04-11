/**
 * G12 — Review moderation admin gate
 *
 * Asserts: navigating to /admin/reviews without an admin session redirects
 * to /admin-login (enforced by the (admin) layout server component calling
 * getAdminSession() and redirect("/admin-login")).
 *
 * No seed data required — the redirect is purely auth-based.
 *
 * Further testing (approving/rejecting reviews) requires a real admin session
 * and seeded pending reviews. That is left for a dedicated admin auth fixture.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("G12 — review moderation auth gate", () => {
  test("unauthenticated /admin/reviews redirects to /admin-login", async ({
    page,
  }) => {
    await page.goto(`${BASE}/admin/reviews`);
    await expect(page).toHaveURL(/admin-login/, { timeout: 8000 });
  });
});
