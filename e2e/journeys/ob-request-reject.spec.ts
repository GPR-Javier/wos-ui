import { test, expect } from "@playwright/test"
import {
  slug,
  setupSplitScreen,
  fileOb,
  openBellAndClickNotification,
} from "./_harness"

/**
 * DUAL-ROLE SPLIT-SCREEN journey (REJECT), through the notification bell:
 *   employee files → admin clicks the "request" notif → rejects (with a reason) →
 *   employee clicks the "rejected" notif → sees it Rejected.
 * Run: pnpm e2e:journey · review: pnpm e2e:report. Creates a REAL OB each run.
 */
test("employee files OB → admin rejects → employee sees it rejected", async () => {
  test.setTimeout(180_000)
  const { employee, admin, finish } = await setupSplitScreen(test.info())
  const purpose = `E2E reject OB ${Date.now()}`

  try {
    await fileOb(employee, purpose)
    await employee.goto(`/${slug}/dashboard`)

    // Admin reaches the OB page via the "request" notification, then rejects.
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
    await adminRow.getByTestId("ob-reject").click()
    await admin
      .getByTestId("ob-review-note")
      .fill("Not this week — please reschedule.")
    const reviewReject = admin.getByTestId("ob-review-reject")
    await reviewReject.click()
    await expect(reviewReject).toBeHidden()

    // Employee clicks the "rejected" notification → lands on my-or → row is Rejected.
    await openBellAndClickNotification(
      employee,
      "Official business rejected",
      new RegExp(`/${slug}/dashboard/my-or`)
    )
    const empRow = employee.getByTestId("ob-row").filter({ hasText: purpose })
    await expect(empRow.getByText("Rejected")).toBeVisible({ timeout: 10_000 })

    await employee.waitForTimeout(2000)
  } finally {
    await finish()
  }
})
