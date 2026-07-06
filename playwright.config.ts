import { defineConfig, devices } from "@playwright/test"
import { existsSync, readFileSync } from "node:fs"

// Load e2e env from .env.e2e (gitignored) without a dotenv dependency. See .env.e2e.example.
if (existsSync(".env.e2e")) {
  for (const line of readFileSync(".env.e2e", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
}

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on", // scrub every run in the trace viewer (time-travel DOM)
    video: "on", // watch the screen flow back after a run
    screenshot: "on",
  },
  projects: [
    // ── Reset + seed (runs FIRST) ─────────────────────────────────────────────
    // Truncates the backend transactional tables and seeds the journey fixtures via the
    // guarded /internal/test/reset endpoints. Every auth setup depends on it, so plain
    // `pnpm e2e` / `pnpm e2e:journey` trigger reset→seed→tests with no extra step. FAILS
    // FAST (throws) if the reset endpoint is unreachable / disabled / rejects the token.
    { name: "setup-reset", testMatch: "**/reset.setup.ts" },

    // ── Auth capture ─────────────────────────────────────────────────────────
    // Admin: email/password, fully automated. Runs as a dependency of the admin suite.
    {
      name: "setup-admin",
      testMatch: "**/auth.admin.setup.ts",
      dependencies: ["setup-reset"],
    },
    // Employee: email/password (use a password-based test employee, NOT Google OAuth —
    // Google blocks automated sign-in). Fully automated, same as admin.
    {
      name: "setup-employee",
      testMatch: "**/auth.employee.setup.ts",
      dependencies: ["setup-reset"],
    },
    // Second admin: only the co-approver journey needs it. SKIPS itself (no throw) when
    // E2E_ADMIN2_* creds are absent, so the other journeys aren't forced to have one.
    {
      name: "setup-admin2",
      testMatch: "**/auth.admin2.setup.ts",
      dependencies: ["setup-reset"],
    },

    // ── Role suites (specs split by folder) ──────────────────────────────────
    {
      name: "admin",
      testMatch: "**/admin/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup-admin"],
    },
    {
      name: "employee",
      testMatch: "**/employee/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/employee.json",
      },
      dependencies: ["setup-employee"],
    },

    // ── Dual-role journeys: one test drives BOTH roles in side-by-side windows.
    // Contexts are created in-test from both saved sessions (admin auto + employee
    // pre-captured). Run with `pnpm e2e:journey`. Needs employee.json captured first.
    {
      name: "journey",
      testMatch: "**/journeys/**/*.spec.ts",
      // setup-admin2 is a no-op when its creds aren't set, so listing it here is safe;
      // it only produces admin2.json for the (self-skipping) co-approver journey.
      dependencies: ["setup-admin", "setup-employee", "setup-admin2"],
      // The journey launches its own browsers and manages per-role trace/video
      // itself, so disable the runner's auto-instrumentation to avoid a double-start.
      use: { trace: "off", video: "off", screenshot: "off" },
    },
  ],
  // Drive your already-running dev server; start one if none is up.
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
