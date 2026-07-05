import { test, expect } from "@playwright/test"

// Runs as the ADMIN (auto email/password session). Template for the OB
// management screen — extend into a real approve/reject flow.
const slug = process.env.E2E_SLUG ?? ""

test.describe("Official Business (admin)", () => {
  test("opens the OB management screen", async ({ page }) => {
    await page.goto(`/${slug}/dashboard/ob`)

    await expect(
      page.getByRole("heading", { name: /Official Business/i })
    ).toBeVisible()

    // ── To make this a real approve flow, act on a PENDING row via testids: ──
    // const row = page.getByTestId("ob-mgmt-row").first()
    // await row.getByTestId("ob-approve").click()
    // const confirm = page.getByTestId("ob-review-approve")
    // await confirm.click()
    // await expect(confirm).toBeHidden()
  })
})
