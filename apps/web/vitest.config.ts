import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

const env = loadEnv("test", path.resolve(__dirname), "");

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.{ts,tsx}", "__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".next", "e2e"],
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: env.DATABASE_URL ?? "postgresql://doktori:doktori_dev_2026@localhost:5434/doktori",
      NEXTAUTH_SECRET: env.NEXTAUTH_SECRET ?? "test-secret",
      NEXTAUTH_URL: env.NEXTAUTH_URL ?? "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@doktori/db": path.resolve(__dirname, "../../packages/db/src"),
    },
  },
});
