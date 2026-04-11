import { defineConfig, devices } from "@playwright/test";

/**
 * Doktori web — Playwright smoke test configuration.
 *
 * Run against a live dev server:
 *   pnpm exec playwright test
 *
 * Override base URL:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Do not start a dev server automatically — tests assume a running server.
  // webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true },
});
