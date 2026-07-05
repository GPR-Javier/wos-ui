import { test as setup } from "@playwright/test"

// Automated EMPLOYEE login (email/password) → saves the session for the employee suite.
// Use a PASSWORD-based test employee, NOT a Google-OAuth account (Google blocks
// automated sign-in). The account needs OB filing permission (OFFICIAL_BUSINESS:FILE_OB)
// for the file step of the journey to work.
// Re-run just this with:  pnpm e2e:auth:employee
const AUTH_FILE = "e2e/.auth/employee.json"

const slug = process.env.E2E_SLUG
const email = process.env.E2E_EMPLOYEE_EMAIL
const password = process.env.E2E_EMPLOYEE_PASSWORD

setup("authenticate employee", async ({ page }) => {
  if (!slug || !email || !password) {
    throw new Error(
      "Missing employee creds. Set E2E_SLUG / E2E_EMPLOYEE_EMAIL / E2E_EMPLOYEE_PASSWORD in .env.e2e (use a password-based test employee, not the Google account)."
    )
  }

  await page.goto(`/${slug}/login`)
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()

  await page.waitForURL(new RegExp(`/${slug}/dashboard`), { timeout: 30_000 })
  await page.context().storageState({ path: AUTH_FILE })
})
