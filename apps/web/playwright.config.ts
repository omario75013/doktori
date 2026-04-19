import { defineConfig, devices } from "@playwright/test";

/**
 * Doktori web — Playwright configuration.
 *
 * Smoke tests against production:
 *   pnpm test:e2e
 *
 * Unit/integration tests against a local dev server:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test --project=local
 *
 * Override base URL for any project:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test
 */
export default defineConfig({
  testDir: "./",
  testMatch: [
    "./tests/**/*.spec.ts",
    "./e2e/**/*.spec.ts",
  ],
  timeout: 30_000,
  retries: 1,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testMatch: "./e2e/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "https://doktori.tn",
      },
    },
    {
      name: "local",
      testMatch: "./tests/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      },
    },
  ],
  // Do not start a dev server automatically — tests assume a running server.
  // webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true },
});
