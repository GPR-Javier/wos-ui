import { test, expect } from "@playwright/test"
import {
  slug,
  setupSplitScreen,
  fileOb,
  openBellAndClickNotification,
  pickAvailableDate,
} from "./_harness"

/**
 * DUAL-ROLE SPLIT-SCREEN journey (RETURN → RESUBMIT), through the notification bell:
 *   employee files → admin returns for revision (note required) →
 *   employee clicks the "needs revision" notif → edits & resubmits → back to Pending.
 * Run: pnpm e2e:journey · review: pnpm e2e:report. Creates a REAL OB each run.
 */
test("employee files OB → admin returns → employee resubmits → back to pending", async () => {
  test.setTimeout(180_000)
  const { employee, admin, finish } = await setupSplitScreen(test.info())
  const purpose = `E2E return OB ${Date.now()}`

  try {
    await fileOb(employee, purpose)
    await employee.goto(`/${slug}/dashboard`)

    // Admin returns it for revision (a note is required for return).
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
    await adminRow.getByTestId("ob-return").click()
    await admin
      .getByTestId("ob-review-note")
      .fill("Please add the client name to the purpose.")
    const reviewReturn = admin.getByTestId("ob-review-return")
    await reviewReturn.click()
    await expect(reviewReturn).toBeHidden()

    // Employee clicks the "needs revision" notification → my-or → row is Returned.
    await openBellAndClickNotification(
      employee,
      "Official business needs revision",
      new RegExp(`/${slug}/dashboard/my-or`)
    )
    const empRow = employee.getByTestId("ob-row").filter({ hasText: purpose })
    await expect(empRow.getByText("Returned")).toBeVisible({ timeout: 10_000 })

    // Employee edits + resubmits (RETURNED → PENDING). The edit pencil opens the modal
    // in resubmit mode; re-pick a valid date so Submit is enabled, then resubmit.
    await empRow.getByRole("button", { name: "Edit" }).click()
    const resubmit = employee.getByTestId("ob-submit")
    await pickAvailableDate(employee.getByTestId("ob-date"), resubmit)
    await resubmit.click()
    await expect(resubmit).toBeHidden()
    await expect(empRow.getByText("Pending")).toBeVisible({ timeout: 10_000 })

    await employee.waitForTimeout(2000)
  } finally {
    await finish()
  }
})
