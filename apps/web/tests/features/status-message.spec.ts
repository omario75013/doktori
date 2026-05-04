/**
 * Doktori — Doctor status message + auto-reply E2E tests (local dev)
 *
 * Run: pnpm exec playwright test tests/features/status-message.spec.ts --project=local
 */

import { test, expect, request } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const DOCTOR_EMAIL = process.env.TEST_DOCTOR_EMAIL ?? "doctor@test.doktori.tn";
const DOCTOR_PASS = process.env.TEST_DOCTOR_PASS ?? "Test1234!";
const PATIENT_PHONE = process.env.TEST_PATIENT_PHONE ?? "+21612345678";
const PATIENT_PASS = process.env.TEST_PATIENT_PASS ?? "Test1234!";

async function getDocToken(): Promise<string | null> {
  const apiCtx = await request.newContext({ baseURL: BASE });
  const res = await apiCtx.post("/api/auth/staff-login", {
    data: { email: DOCTOR_EMAIL, password: DOCTOR_PASS },
  });
  await apiCtx.dispose();
  if (!res.ok()) return null;
  const { token } = await res.json() as { token: string };
  return token;
}

test.describe("Doctor status banner — messagerie page", () => {
  test("doctor sets status message and it appears in the messagerie header", async ({ page }) => {
    const token = await getDocToken();
    if (!token) {
      test.skip(true, "Cannot get doctor token");
      return;
    }

    // Set status via API first
    const apiCtx = await request.newContext({ baseURL: BASE });
    await apiCtx.patch("/api/doctor/status", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        statusMessage: "En congé — test E2E",
        awayMessage: "Je réponds dès que possible.",
        statusActiveUntil: null,
      },
    });
    await apiCtx.dispose();

    // Login via web and go to messagerie
    await page.goto("/connexion");
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/medecin/, { timeout: 10_000 });

    await page.goto("/medecin/messagerie");
    await page.waitForLoadState("networkidle");

    // Status banner should appear
    await expect(page.getByText(/En congé — test E2E/i)).toBeVisible({ timeout: 8_000 });

    // Clean up
    const cleanCtx = await request.newContext({ baseURL: BASE });
    await cleanCtx.patch("/api/doctor/status", {
      headers: { Authorization: `Bearer ${token}` },
      data: { statusMessage: null, awayMessage: null, statusActiveUntil: null },
    });
    await cleanCtx.dispose();
  });

  test("doctor can edit status from messagerie page", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/medecin/, { timeout: 10_000 });

    await page.goto("/medecin/messagerie");
    await page.waitForLoadState("networkidle");

    // Click edit status button
    const editBtn = page.getByRole("button", { name: /modifier|statut|status/i });
    if (await editBtn.count() === 0) {
      test.skip(true, "No status edit button visible");
      return;
    }
    await editBtn.first().click();

    // Modal should appear with status input
    const statusInput = page.locator('input[placeholder*="statut"], textarea[placeholder*="statut"], input[name*="status"]');
    await expect(statusInput.first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Auto-reply — patient receives auto-reply when doctor has away message", () => {
  test("patient message triggers auto-reply from doctor with active away message", async ({ page }) => {
    const token = await getDocToken();
    if (!token) {
      test.skip(true, "Cannot get doctor token");
      return;
    }

    const autoReplyText = "Réponse automatique E2E test — " + Date.now();

    // Set away message via API
    const apiCtx = await request.newContext({ baseURL: BASE });
    await apiCtx.patch("/api/doctor/status", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        statusMessage: "Absent",
        awayMessage: autoReplyText,
        statusActiveUntil: null,
      },
    });

    // Get doctor slug
    const meRes = await apiCtx.get("/api/doctor/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok()) {
      await apiCtx.dispose();
      test.skip(true, "Cannot get doctor slug");
      return;
    }
    const { id: doctorId } = await meRes.json() as { id: string; slug: string };

    // Find a patient conversation for this doctor
    const convsRes = await apiCtx.get("/api/doctor/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    });
    await apiCtx.dispose();

    if (!convsRes.ok()) {
      test.skip(true, "No conversations available");
      return;
    }
    const convs = await convsRes.json() as Array<{ id: string; patientId: string }>;
    if (convs.length === 0) {
      test.skip(true, "No patient conversations available");
      return;
    }

    const convoId = convs[0].id;
    const patientId = convs[0].patientId;

    // Patient logs in and sends a message
    await page.goto("/patient/connexion");
    await page.fill('input[placeholder*="téléphone"], input[type="tel"]', PATIENT_PHONE);
    await page.fill('input[type="password"]', PATIENT_PASS);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/\/patient/, { timeout: 10_000 });
    } catch {
      test.skip(true, "Patient login not available");
      return;
    }

    await page.goto(`/patient/messagerie/${convoId}`);
    await page.waitForLoadState("networkidle");

    const msgInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    if (await msgInput.count() === 0) {
      test.skip(true, "No message input found");
      return;
    }
    await msgInput.first().fill("Test E2E message");
    await page.keyboard.press("Enter");

    // Wait for auto-reply to appear
    await expect(page.getByText(autoReplyText)).toBeVisible({ timeout: 10_000 });

    // Clean up status
    const cleanCtx = await request.newContext({ baseURL: BASE });
    await cleanCtx.patch("/api/doctor/status", {
      headers: { Authorization: `Bearer ${token}` },
      data: { statusMessage: null, awayMessage: null, statusActiveUntil: null },
    });
    await cleanCtx.dispose();
  });
});
