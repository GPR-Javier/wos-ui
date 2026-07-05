import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Vitest owns unit/component tests (*.test.tsx in __tests__/). Playwright E2E
    // lives in e2e/*.spec.ts and must NOT be collected here (it uses @playwright/test).
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "e2e/**"],
  },
})
