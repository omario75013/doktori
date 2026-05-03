import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.{ts,tsx}", "__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".next", "e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@doktori/db": path.resolve(__dirname, "../../packages/db/src"),
    },
  },
});
