import { test, expect } from "@playwright/test"
import {
  slug,
  setupSplitScreen,
  fileOb,
  openBellAndClickNotification,
} from "./_harness"

/**
 * DUAL-ROLE SPLIT-SCREEN journey (APPROVE), through the notification bell:
 *   employee files → admin clicks the "request" notif → approves →
 *   employee clicks the "approved" notif → sees it Approved.
 * Two side-by-side headed windows. Run: pnpm e2e:journey · review: pnpm e2e:report
 * NOTE: creates a REAL OB each run (unique `purpose`); needs the app running + a
 * password-based employee with FILE_OB permission.
 */
test("employee files OB → admin approves → employee sees it approved", async () => {
  test.setTimeout(180_000)
  const { employee, admin, finish } = await setupSplitScreen(test.info())
  const purpose = `E2E approve OB ${Date.now()}`

  try {
    // 1. Employee files, then leaves the OB page so the later notif is a real redirect.
    await fileOb(employee, purpose)
    await employee.goto(`/${slug}/dashboard`)

    // 2. Admin reaches the OB page via the "request" notification, then approves.
    await admin.goto(`/${slug}/dashboard`)
    await openBellAndClickNotification(
      admin,
      "Official business request",
      new RegExp(`/${slug}/dashboard/ob`)
    )
    const adminRow = admin
      .getByTestId("ob-mgmt-row")
      .filter({ hasText: purpose })
    await expect(adminRow).toBeVisible({ timeout: 15_000 })
    await adminRow.getByTestId("ob-approve").click()
    const reviewApprove = admin.getByTestId("ob-review-approve")
    await reviewApprove.click()
    await expect(reviewApprove).toBeHidden()

    // 3. Employee clicks the "approved" notification → lands on my-or → row is Approved.
    await openBellAndClickNotification(
      employee,
      "Official business approved",
      new RegExp(`/${slug}/dashboard/my-or`)
    )
    const empRow = employee.getByTestId("ob-row").filter({ hasText: purpose })
    await expect(empRow.getByText("Approved")).toBeVisible({ timeout: 10_000 })

    await employee.waitForTimeout(2000) // hold the final state on both screens
  } finally {
    await finish()
  }
})
