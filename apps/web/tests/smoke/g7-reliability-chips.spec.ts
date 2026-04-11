/**
 * G7 — Reliability chips (no_show badge)
 *
 * Asserts: a patient with past no_show appointments sees a reliability
 * indicator on their appointment history page.
 *
 * Seed data required: a patient token whose appointment history contains
 * at least one appointment with status "no_show". Without this the badge
 * will never render.
 *
 * All tests in this file are skipped until seed data is available.
 * To enable: set TEST_PATIENT_TOKEN_WITH_NOSHOW in the environment and
 * remove the test.skip() calls.
 */

import { test } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("G7 — reliability chips", () => {
  test.skip(
    true,
    "Requires seed: patient with no_show appointment. " +
      "Set TEST_PATIENT_TOKEN_WITH_NOSHOW and implement test.",
  );

  // Skeleton — implement once seed data is available:
  // test("no_show patient sees reliability chip", async ({ page }) => {
  //   const token = process.env.TEST_PATIENT_TOKEN_WITH_NOSHOW!;
  //   await page.goto(`${BASE}/mes-rdv`);
  //   await page.evaluate((t) => localStorage.setItem("doktori_patient_token", t), token);
  //   await page.reload();
  //   await expect(page.getByText(/absent|no.show|fiabilité/i)).toBeVisible();
  // });
});
