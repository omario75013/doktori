/**
 * G6 — Medical record auth gate
 *
 * Asserts: navigating to /dossier-medical without a patient token in
 * localStorage causes an immediate redirect to /mes-rdv.
 *
 * No seed data required — the redirect is triggered by the absence of
 * "doktori_patient_token" in localStorage (see dossier-medical/page.tsx).
 *
 * Further testing (viewing/editing the record) requires an OTP-authenticated
 * patient session and is left for a dedicated auth fixture task.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("G6 — medical record auth gate", () => {
  test("unauthenticated visit to /dossier-medical redirects to /mes-rdv", async ({
    page,
  }) => {
    // Ensure no patient token is present
    await page.goto(`${BASE}/mes-rdv`);
    await page.evaluate(() => localStorage.removeItem("doktori_patient_token"));

    await page.goto(`${BASE}/dossier-medical`);
    await expect(page).toHaveURL(/mes-rdv/, { timeout: 8000 });
  });
});
