/**
 * G2 — Family booking (booking for a "proche")
 *
 * Asserts: on the RDV form step, clicking "Pour un proche" reveals
 * the beneficiary fields (name, date-of-birth, relation select).
 *
 * Seed data required: a doctor slug that resolves in the DB so the form
 * step is reachable. Without a real slug the page shows "Médecin introuvable."
 * and the test is skipped gracefully.
 *
 * The test reaches the form step by faking the API responses via route
 * interception so no live DB is needed.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const SLUG = process.env.TEST_DOCTOR_SLUG ?? "dr-test-seed";

test.describe("G2 — family booking beneficiary fields", () => {
  test("clicking Pour un proche reveals beneficiary fields", async ({ page }) => {
    // Intercept the doctor API so we don't need real seed data
    await page.route(`**/api/doctors/by-slug/${SLUG}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "doctor-seed-id",
          name: "Dr Test",
          slug: SLUG,
          specialty: "Médecine générale",
          city: "Tunis",
          address: "1 rue test",
          photoUrl: null,
          bio: null,
          consultationFee: 30000,
        }),
      }),
    );

    await page.route("**/api/appointment-types?doctorId=doctor-seed-id", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );

    await page.route("**/api/doctors/doctor-seed-id/practices", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );

    await page.goto(`${BASE}/rdv/${SLUG}`);

    // Wait for form step to appear (slots step falls through to form when no types)
    await expect(page.getByText("Pour un proche")).toBeVisible({ timeout: 10000 });

    // By default "Pour moi" is selected; beneficiary fields should be hidden
    await expect(page.locator("#b-name")).not.toBeVisible();

    // Click "Pour un proche"
    await page.getByRole("button", { name: "Pour un proche" }).click();

    // Beneficiary fields should now be visible
    await expect(page.locator("#b-name")).toBeVisible();
    await expect(page.locator("#b-dob")).toBeVisible();
    await expect(page.locator("#b-relation")).toBeVisible();
  });
});
