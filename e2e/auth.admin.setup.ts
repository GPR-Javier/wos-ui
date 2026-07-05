import { test as setup } from "@playwright/test"

// Automated ADMIN login (email/password) → saves the session for the admin suite.
// Re-run just this with:  pnpm e2e:auth
const AUTH_FILE = "e2e/.auth/admin.json"

const slug = process.env.E2E_SLUG
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

setup("authenticate admin", async ({ page }) => {
  if (!slug || !email || !password) {
    throw new Error(
      "Missing admin creds. Set E2E_SLUG / E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD in .env.e2e."
    )
  }

  await page.goto(`/${slug}/login`)
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()

  // Matches the dashboard root (/gpr/dashboard) AND any sub-page.
  await page.waitForURL(new RegExp(`/${slug}/dashboard`), { timeout: 30_000 })
  await page.context().storageState({ path: AUTH_FILE })
})
