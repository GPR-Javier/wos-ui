import { test as setup } from "@playwright/test"

// ── Hermetic E2E reset + seed ────────────────────────────────────────────────
// Runs BEFORE every auth setup (they declare this project as a dependency), so a
// `pnpm e2e:journey` (or `pnpm e2e`) always starts from a deterministic baseline:
// the transactional request tables are truncated and the fixtures the journeys
// need are (idempotently) seeded — the test employee's VACATION leave credit and
// admin2's Company Admin role in the same company.
//
// It calls the GUARDED backend reset endpoints directly (not raw SQL):
//   POST {HR_API_URL}/api/hr/internal/test/reset
//   POST {NOTIFICATION_API_URL}/api/notification/internal/test/reset
// Both are double-guarded: the `e2e.reset.enabled` flag (dev/test profile only)
// AND the shared X-Internal-Token. This step FAILS FAST if either endpoint is
// unreachable / disabled / rejects the token, so tests never run against dirty
// or unseeded data.
//
// Env (see .env.e2e.example): E2E_RESET_TOKEN, HR_API_URL, NOTIFICATION_API_URL,
// E2E_COMPANY_ID, E2E_VACATION_CREDITS. Employee/admin2 are seeded by resolving
// E2E_EMPLOYEE_EMAIL / E2E_ADMIN2_EMAIL to their identity ids on the backend.

const HR_API_URL = process.env.HR_API_URL ?? "http://localhost:8083"
const NOTIFICATION_API_URL =
  process.env.NOTIFICATION_API_URL ?? "http://localhost:8086"
// Defaults to the well-known dev token so a local `pnpm e2e:journey` works with no
// extra config; override in prod-like runs. Must match the backend `internal.service-token`.
const RESET_TOKEN = process.env.E2E_RESET_TOKEN ?? "wos-internal-dev-token"

function explainFailure(
  service: string,
  url: string,
  status: number,
  body: string
): string {
  const hints: Record<number, string> = {
    404:
      "endpoint is DISABLED (e2e.reset.enabled=false) or not deployed — set `e2e.reset.enabled: true` " +
      "in the backend dev/test profile (application-dev.yaml) and restart it",
    401: "X-Internal-Token rejected — E2E_RESET_TOKEN must match the backend `internal.service-token`",
    403: "X-Internal-Token rejected — E2E_RESET_TOKEN must match the backend `internal.service-token`",
  }
  const hint = hints[status] ?? "unexpected status"
  return `[e2e reset] ${service} reset failed (${status}) at ${url}: ${hint}. Response: ${body}`
}

setup("reset + seed backend test data", async ({ request }) => {
  const companyId = process.env.E2E_COMPANY_ID
    ? Number(process.env.E2E_COMPANY_ID)
    : undefined
  const vacationCredits = process.env.E2E_VACATION_CREDITS
    ? Number(process.env.E2E_VACATION_CREDITS)
    : undefined

  // ── wos-hr: truncate request tables + seed employee credit / admin2 admin ──
  const hrUrl = `${HR_API_URL}/api/hr/internal/test/reset`
  let hrRes
  try {
    hrRes = await request.post(hrUrl, {
      headers: {
        "X-Internal-Token": RESET_TOKEN,
        "Content-Type": "application/json",
      },
      data: {
        companyId,
        employeeEmail: process.env.E2E_EMPLOYEE_EMAIL,
        admin2Email: process.env.E2E_ADMIN2_EMAIL,
        vacationCredits,
      },
    })
  } catch (e) {
    throw new Error(
      `[e2e reset] could not reach wos-hr at ${hrUrl} — is the backend running on 8083? (${String(e)})`
    )
  }
  if (!hrRes.ok()) {
    throw new Error(
      explainFailure("wos-hr", hrUrl, hrRes.status(), await hrRes.text())
    )
  }
  const hrSummary = await hrRes.json()
  console.log("[e2e reset] wos-hr:", JSON.stringify(hrSummary))
  // Seed warnings (e.g. an unresolved email / missing admin2) don't fail the run, but they
  // almost always explain a later journey failure, so surface them loudly.
  if (Array.isArray(hrSummary.warnings) && hrSummary.warnings.length > 0) {
    console.warn(
      "[e2e reset] wos-hr seed warnings:\n  - " +
        hrSummary.warnings.join("\n  - ")
    )
  }

  // ── wos-notification: truncate the notifications table ──
  const notifUrl = `${NOTIFICATION_API_URL}/api/notification/internal/test/reset`
  let notifRes
  try {
    notifRes = await request.post(notifUrl, {
      headers: { "X-Internal-Token": RESET_TOKEN },
    })
  } catch (e) {
    throw new Error(
      `[e2e reset] could not reach wos-notification at ${notifUrl} — is the backend running on 8086? (${String(e)})`
    )
  }
  if (!notifRes.ok()) {
    throw new Error(
      explainFailure(
        "wos-notification",
        notifUrl,
        notifRes.status(),
        await notifRes.text()
      )
    )
  }
  console.log(
    "[e2e reset] wos-notification:",
    JSON.stringify(await notifRes.json())
  )
})
