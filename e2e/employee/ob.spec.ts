import { test, expect } from "@playwright/test"

// Runs as the EMPLOYEE (Google-OAuth session captured via `pnpm e2e:auth:employee`).
// Template flow — copy it for the next feature, or extend the commented block
// into a real file→list check.
const slug = process.env.E2E_SLUG ?? ""

test.describe("Official Business (employee)", () => {
  test("opens the OB list and the file-request modal", async ({ page }) => {
    await page.goto(`/${slug}/dashboard/my-or`)

    await expect(
      page.getByRole("heading", { name: "Official Business" })
    ).toBeVisible()

    // Open the file-OB modal.
    await page.getByTestId("ob-new-request").click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Official Business Request")).toBeVisible()
    await expect(page.getByTestId("ob-submit")).toBeVisible()

    // Non-destructive: close without creating real data.
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toBeHidden()

    // ── To make this a REAL end-to-end file, replace the close above with: ──
    // await page.getByTestId("ob-purpose").fill("E2E smoke OB")
    // const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("en-CA")
    // await page.getByTestId("ob-date").fill(tomorrow)
    // await page.getByTestId("ob-location").fill("BGC")
    // await page.getByTestId("ob-submit").click()
    // await expect(dialog).toBeHidden()
    // await expect(page.getByText("E2E smoke OB")).toBeVisible()
  })
})
