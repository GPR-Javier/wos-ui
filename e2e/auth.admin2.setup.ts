import { test as setup } from "@playwright/test"

// Automated SECOND-ADMIN login (email/password) → saves the session used ONLY by the
// co-approver notification journey (ob-co-approver-notified.spec.ts). This must be a
// DIFFERENT company admin than E2E_ADMIN, in the SAME company, so that when the first
// admin approves an OB the "Official business handled / No action needed" notice is
// raised for this second approver.
//
// Unlike the admin/employee setups this one SKIPS (does not throw) when its creds are
// absent, so the existing OB journeys keep running for anyone who hasn't provisioned a
// second admin. The co-approver spec self-skips in the same case.
// Re-run just this with:  pnpm e2e:auth:admin2
const AUTH_FILE = "e2e/.auth/admin2.json"

const slug = process.env.E2E_SLUG
const email = process.env.E2E_ADMIN2_EMAIL
const password = process.env.E2E_ADMIN2_PASSWORD

setup("authenticate second admin", async ({ page }) => {
  setup.skip(
    !slug || !email || !password,
    "Second-admin creds not set (E2E_SLUG / E2E_ADMIN2_EMAIL / E2E_ADMIN2_PASSWORD in .env.e2e). The co-approver journey will self-skip."
  )

  await page.goto(`/${slug}/login`)
  await page.locator("#email").fill(email!)
  await page.locator("#password").fill(password!)
  await page.getByRole("button", { name: "Sign in" }).click()

  await page.waitForURL(new RegExp(`/${slug}/dashboard`), { timeout: 30_000 })
  await page.context().storageState({ path: AUTH_FILE })
})
