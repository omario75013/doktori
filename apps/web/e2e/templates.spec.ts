/**
 * Doktori — Prescription Templates E2E Tests
 *
 * Tests the full templates flow:
 *   1. Doctor creates a template via UI, applies it in a prescription, saves
 *   2. Clone of official template preserves original intact
 *   3. Template with missing patient data shows ___ placeholders
 *
 * Prerequisites:
 *   - Feature flag `prescription_templates_enabled` must be enabled in DB:
 *       UPDATE feature_flags SET enabled = true
 *       WHERE key = 'prescription_templates_enabled';
 *   - A test doctor with credentials and at least one completed RDV must be
 *     seeded in the dev DB (see docs/demo/credentials.md).
 *   - Run against local dev server:
 *       PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/templates.spec.ts
 *
 * TODO (to un-skip): wire up the shared `loginAsDoctor(page)` helper once
 * a test-doctor seed and a local auth fixture are established for the
 * `local` playwright project.
 */

import { test, expect } from "@playwright/test";

// ── Shared helpers ────────────────────────────────────────────────────────────

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://doktori.tn";

/**
 * TODO: replace credentials with values from docs/demo/credentials.md
 * and a test doctor that has at least one completed appointment.
 */
async function loginAsDoctor(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never) {
  await page.goto(`${BASE}/connexion`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', process.env.TEST_DOCTOR_EMAIL ?? "doctor@test.doktori.tn");
  await page.fill('input[type="password"]', process.env.TEST_DOCTOR_PASSWORD ?? "TestDoctor123!");
  await page.click('button[type="submit"]');
  // Wait for redirect to doctor dashboard
  await page.waitForURL(`${BASE}/medecin**`, { timeout: 10_000 });
}

// ── Scenario 1 ────────────────────────────────────────────────────────────────

test.describe("Templates — Create + Apply in Prescription", () => {
  test.skip(
    !process.env.RUN_TEMPLATE_E2E,
    "Skipped: set RUN_TEMPLATE_E2E=1 and provide TEST_DOCTOR_EMAIL/PASSWORD to run"
  );

  test("doctor creates a template, applies it in a prescription, content renders correctly", async ({
    page,
  }) => {
    await loginAsDoctor(page);

    // ── Step 1: create a new template ──────────────────────────────────────
    await page.goto(`${BASE}/medecin/modeles/nouveau`);
    await page.waitForLoadState("networkidle");

    const templateTitle = `Test template ${Date.now()}`;
    await page.fill('input[id="title"]', templateTitle);
    await page.fill('input[id="description"]', "Created by E2E");

    // Type template body with a known variable
    const bodyTextarea = page.locator("textarea").first();
    await bodyTextarea.fill(
      "Bonjour {{first_name}},\n\nVeuillez prendre Amoxicilline 500mg matin et soir."
    );

    // Save
    await page.click('button:has-text("Sauvegarder")');
    await page.waitForURL(`${BASE}/medecin/modeles`, { timeout: 10_000 });

    // Verify template appears in list
    await expect(page.getByText(templateTitle)).toBeVisible({ timeout: 5_000 });

    // ── Step 2: navigate to a patient with completed RDV ───────────────────
    // TODO: replace with a test patient ID from seed data
    await page.goto(`${BASE}/medecin/patients`);
    await page.waitForLoadState("networkidle");

    const firstPatient = page.locator('a[href*="/medecin/patients/"]').first();
    await expect(firstPatient).toBeVisible({ timeout: 10_000 });
    await firstPatient.click();
    await page.waitForLoadState("networkidle");

    // Go to Ordonnances tab
    await page.getByText(/ordonnance/i).first().click();
    await page.waitForTimeout(500);

    // Open new prescription modal
    await page.getByText(/nouvelle ordonnance/i).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Fallback: look for the modal by heading
      return expect(page.getByText("Nouvelle ordonnance").last()).toBeVisible();
    });

    // ── Step 3: apply the template ─────────────────────────────────────────
    await page.getByText("Choisir un modèle").click();
    // Wait for template modal to open
    await expect(page.getByText("Choisir un modèle d'ordonnance")).toBeVisible({ timeout: 5_000 });

    // Select our newly created template
    await page.getByText(templateTitle).click();

    // Template body should appear in the editable textarea
    await expect(page.locator("textarea").last()).toContainText("Amoxicilline");

    // Click "Insérer"
    await page.getByText("Insérer").click();

    // Content should appear in the prescription textarea
    await expect(page.locator("textarea").first()).toContainText("Amoxicilline");

    // ── Step 4: save the prescription ─────────────────────────────────────
    await page.getByText("Enregistrer l'ordonnance").click();
    await expect(page.getByText(/ordonnance enregistrée/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ── Scenario 2 ────────────────────────────────────────────────────────────────

test.describe("Templates — Clone preserves original", () => {
  test.skip(
    !process.env.RUN_TEMPLATE_E2E,
    "Skipped: set RUN_TEMPLATE_E2E=1 and provide TEST_DOCTOR_EMAIL/PASSWORD to run"
  );

  test("cloning an official template creates a copy, original remains official and intact", async ({
    page,
  }) => {
    await loginAsDoctor(page);

    await page.goto(`${BASE}/medecin/modeles`);
    await page.waitForLoadState("networkidle");

    // Find first official template
    const officialSection = page.getByText("Modèles officiels").first();
    await expect(officialSection).toBeVisible({ timeout: 5_000 });

    // Get the title of the first official template before cloning
    const firstOfficialTitle = await page
      .locator(".text-sm.font-semibold")
      .first()
      .textContent();

    // Click the clone button (copy icon) next to the first official template
    await page.locator('[aria-label="Cloner"], button:has([data-lucide="copy"])').first().click();

    // Toast should confirm cloning
    await expect(page.getByText(/copie|cloné|clone/i)).toBeVisible({ timeout: 5_000 });

    // Original must still exist and still be official
    const originalCard = page.getByText(firstOfficialTitle ?? "").first();
    await expect(originalCard).toBeVisible();

    // A new personal template with "Copie de" prefix should appear
    await expect(page.getByText(/copie de/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ── Scenario 3 ────────────────────────────────────────────────────────────────

test.describe("Templates — Missing patient data shows placeholders", () => {
  test.skip(
    !process.env.RUN_TEMPLATE_E2E,
    "Skipped: set RUN_TEMPLATE_E2E=1 and provide TEST_DOCTOR_EMAIL/PASSWORD to run"
  );

  test("applying a template with variables missing from patient context shows ___ placeholders", async ({
    page,
  }) => {
    await loginAsDoctor(page);

    // Create a template with variables that are unlikely to be filled
    await page.goto(`${BASE}/medecin/modeles/nouveau`);
    await page.waitForLoadState("networkidle");

    const templateTitle = `Placeholder test ${Date.now()}`;
    await page.fill('input[id="title"]', templateTitle);

    // Use variables that need specific patient data (cin, insurance)
    const bodyTextarea = page.locator("textarea").first();
    await bodyTextarea.fill(
      "CIN: {{cin}}\nMutuelle: {{insurance_provider}}\nAllergies: {{allergies}}"
    );

    await page.click('button:has-text("Sauvegarder")');
    await page.waitForURL(`${BASE}/medecin/modeles`, { timeout: 10_000 });

    // Open a prescription modal for a patient that likely has missing CIN/insurance
    await page.goto(`${BASE}/medecin/patients`);
    await page.waitForLoadState("networkidle");

    const firstPatient = page.locator('a[href*="/medecin/patients/"]').first();
    await firstPatient.click();
    await page.waitForLoadState("networkidle");

    await page.getByText(/ordonnance/i).first().click();
    await page.getByText(/nouvelle ordonnance/i).click();

    // Open template modal
    await page.getByText("Choisir un modèle").click();
    await expect(page.getByText("Choisir un modèle d'ordonnance")).toBeVisible({ timeout: 5_000 });

    // Select our template
    await page.getByText(templateTitle).click();

    // The unresolved warning should be visible (at least one ___ placeholder)
    const unresolvedWarning = page.getByText(/variable.*non résolue|non résolue/i);
    await expect(unresolvedWarning).toBeVisible({ timeout: 5_000 });

    // The preview/textarea should contain ___ for missing variables
    const editableArea = page.locator("textarea").last();
    const textContent = await editableArea.inputValue();
    expect(textContent).toContain("___");
  });
});
