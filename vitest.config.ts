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
    coverage: {
      provider: "v8",
      // text → terminal table; html → browsable report at coverage/index.html
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      // Report only files exercised by tests (Vitest 4's default — untested files
      // are omitted unless added to `include`).
      // Per-file 100% gates for the fully-tested Official Business module only.
      // Glob-keyed thresholds keep the rest of the app off the 100% hook for now;
      // add more modules here as they reach full coverage. Fails the run (exit 1)
      // if any listed file regresses below 100 on any metric.
      thresholds: {
        "**/lib/ob-api.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "**/hooks/use-ob.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "**/components/custom/ob-modal.tsx": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "**/components/dashboard/admin/ob-management.tsx": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "**/components/dashboard/employee/my-ob.tsx": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
})
