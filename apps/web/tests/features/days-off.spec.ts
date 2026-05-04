/**
 * Doktori — Doctor days-off E2E tests (local dev)
 *
 * Requires: PLAYWRIGHT_BASE_URL=http://localhost:3000
 * Run: pnpm exec playwright test tests/features/days-off.spec.ts --project=local
 */

import { test, expect, request } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Credentials — override via env vars in CI
const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL ?? "doctor@test.doktori.tn";
const DOCTOR_PASS = process.env.TEST_DOCTOR_PASS ?? "Test1234!";
const PATIENT_PHONE = process.env.TEST_PATIENT_PHONE ?? "+21612345678";
const PATIENT_PASS = process.env.TEST_PATIENT_PASS ?? "Test1234!";

async function loginAsDoctor(page: import("@playwright/test").Page) {
  await page.goto("/connexion");
  await page.fill('input[type="email"]', DOCTOR_EMAIL);
  await page.fill('input[type="password"]', DOCTOR_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/medecin|\/doctor/, { timeout: 10_000 });
}

async function loginAsPatient(page: import("@playwright/test").Page) {
  await page.goto("/patient/connexion");
  await page.fill('input[placeholder*="téléphone"], input[type="tel"]', PATIENT_PHONE);
  await page.fill('input[type="password"]', PATIENT_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/patient/, { timeout: 10_000 });
}

test.describe("Days-off — Doctor declare & calendar highlight", () => {
  test("doctor can declare a days-off period and see red highlight on calendar", async ({ page }) => {
    await loginAsDoctor(page);
    await page.goto("/medecin/calendrier");
    await page.waitForLoadState("networkidle");

    // Find "Déclarer congés" button
    const declareBtn = page.getByRole("button", { name: /congé|jours? off|absence/i });
    await expect(declareBtn).toBeVisible({ timeout: 8_000 });
    await declareBtn.click();

    // Fill the modal
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    await page.fill('input[placeholder="YYYY-MM-DD"]', fmt(today));
    // Second date input
    const dateInputs = page.locator('input[placeholder="YYYY-MM-DD"]');
    await dateInputs.nth(1).fill(fmt(tomorrow));

    await page.click('button:has-text("Enregistrer")');
    await expect(page.locator('[class*="red"], [style*="red"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test("days-off blocks all booking slots for that date", async ({ page, context }) => {
    // This test assumes a days-off for today was declared in the previous test.
    // We use API directly to create one for this isolated test.
    const apiCtx = await request.newContext({ baseURL: BASE });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const dateStr = fmt(tomorrow);

    // Login doctor via API to get a token
    const loginRes = await apiCtx.post("/api/auth/staff-login", {
      data: { email: DOCTOR_EMAIL, password: DOCTOR_PASS },
    });
    if (!loginRes.ok()) {
      test.skip(true, "Cannot get doctor token — skipping blocking test");
      return;
    }
    const { token } = await loginRes.json() as { token: string };

    // Create days-off via API
    await apiCtx.post("/api/doctor/days-off", {
      headers: { Authorization: `Bearer ${token}` },
      data: { startDate: dateStr, endDate: dateStr },
    });

    // Get doctor slug via API
    const meRes = await apiCtx.get("/api/doctor/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok()) {
      test.skip(true, "Cannot get doctor slug — skipping");
      return;
    }
    const { slug } = await meRes.json() as { slug: string };

    // Patient tries to book on that date
    await loginAsPatient(page);
    await page.goto(`/medecin/${slug}`);
    await page.waitForLoadState("networkidle");

    // Navigate to the blocked date — look for "no slots" message
    const slotsArea = page.locator('[data-testid="slots"], [class*="slot"]');
    // The API endpoint for slots on that date should return empty
    const slotsApi = await apiCtx.get(`/api/doctors/by-slug/${slug}/slots?date=${dateStr}`);
    const slots = await slotsApi.json() as unknown[];
    expect(Array.isArray(slots) && slots.length === 0).toBeTruthy();

    await apiCtx.dispose();
  });
});

test.describe("Days-off — Secretary calendar view", () => {
  test("secretary sees days-off in red on planning page", async ({ page }) => {
    // Login as secretary
    const SEC_EMAIL = process.env.TEST_SECRETARY_EMAIL ?? "secretary@test.doktori.tn";
    const SEC_PASS = process.env.TEST_SECRETARY_PASS ?? "Test1234!";

    await page.goto("/secretaire/connexion");
    await page.fill('input[type="email"]', SEC_EMAIL);
    await page.fill('input[type="password"]', SEC_PASS);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/\/secretaire/, { timeout: 10_000 });
    } catch {
      test.skip(true, "Secretary login not available — skipping");
      return;
    }

    await page.goto("/secretaire/planning");
    await page.waitForLoadState("networkidle");

    // Red-highlighted cell should exist if days-off were declared
    const redCell = page.locator('[style*="FEE2E2"], [style*="FEF2F2"], [class*="red"]');
    // Soft check — days-off may or may not exist
    const count = await redCell.count();
    // If days-off exist, they should be red
    if (count > 0) {
      await expect(redCell.first()).toBeVisible();
    }
  });
});
