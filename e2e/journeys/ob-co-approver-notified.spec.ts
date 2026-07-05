import { test, expect } from "@playwright/test"
import {
  slug,
  setupSplitScreen,
  setupCoApprover,
  fileOb,
  openBellAndClickNotification,
} from "./_harness"

/**
 * CO-APPROVER "HANDLED" NOTIFICATION journey (Official Business).
 *
 * Backend feature (wos-hr, FE-transparent): when a request has MORE THAN ONE approver,
 * the moment one approver acts (approve/reject/return) the OTHER approvers — the
 * requester's reporting-line leads plus the company's admins — receive an in-app
 * "… handled … No action needed." notification so their pending list can be cleared.
 * The requester still gets the normal outcome notice; the acting reviewer is excluded.
 *
 * This proves it end-to-end for OB, THROUGH THE NOTIFICATION BELL:
 *   employee files an OB
 *     → admin (approver #1) approves it
 *     → admin2 (approver #2) sees "Official business handled" in their bell — clicking it
 *        lands on /dashboard/ob — AND the request has dropped off their PENDING list.
 *
 * WHY TWO COMPANY ADMINS (not a lead + admin): the recipient set for the "handled" notice
 * is (requester's reporting-line leads ∪ company admins) − requester − actor. Company
 * admins are ALWAYS recipients and can ALWAYS reach the OB management table, so a second
 * admin is the most permission-robust "other approver" to drive from the UI. A
 * reporting-line-lead-only approver would additionally need FE access to that table, which
 * isn't guaranteed. The notification path being asserted is identical either way.
 *
 * SETUP: needs a SECOND password-based company admin in the SAME company as `admin`
 * (E2E_ADMIN2_EMAIL / E2E_ADMIN2_PASSWORD → e2e/.auth/admin2.json). Without those creds the
 * test self-skips (and setup-admin2 no-ops). Creates a REAL OB each run (unique `purpose`).
 * Run: pnpm e2e:journey · review: pnpm e2e:report.
 */
test("employee files OB → admin approves → the OTHER approver is notified it was handled", async () => {
  test.skip(
    !process.env.E2E_ADMIN2_EMAIL || !process.env.E2E_ADMIN2_PASSWORD,
    "Set E2E_ADMIN2_EMAIL / E2E_ADMIN2_PASSWORD (a second company admin) to run the co-approver journey."
  )
  test.setTimeout(180_000)

  const { employee, admin, finish } = await setupSplitScreen(test.info())
  const { page: approver2, finish: finishApprover2 } = await setupCoApprover(
    test.info()
  )
  const purpose = `E2E co-approver OB ${Date.now()}`

  try {
    // 1. Employee files the OB, then leaves the page.
    await fileOb(employee, purpose)
    await employee.goto(`/${slug}/dashboard`)

    // 2. The SECOND approver confirms the request IS on their pending list first — this is
    //    the row we expect to disappear once the other approver acts.
    await approver2.goto(`/${slug}/dashboard/ob`)
    await approver2.getByRole("button", { name: /^Pending/ }).click()
    await expect(
      approver2.getByTestId("ob-mgmt-row").filter({ hasText: purpose })
    ).toBeVisible({ timeout: 15_000 })
    // Park on a neutral page so the later "handled" notif click is a real redirect to /ob.
    await approver2.goto(`/${slug}/dashboard`)

    // 3. Approver #1 (admin) reaches the OB page via the "request" notif, then approves.
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

    // 4a. The OTHER approver receives "Official business handled" (the co-approver notice);
    //     clicking it lands on /dashboard/ob. This is the core assertion of the feature.
    await openBellAndClickNotification(
      approver2,
      "Official business handled",
      new RegExp(`/${slug}/dashboard/ob`)
    )

    // 4b. …and the request has dropped off their PENDING list — it's APPROVED now, so it is
    //     no longer actionable by the second approver.
    await approver2.getByRole("button", { name: /^Pending/ }).click()
    await expect(
      approver2.getByTestId("ob-mgmt-row").filter({ hasText: purpose })
    ).toHaveCount(0, { timeout: 15_000 })

    await approver2.waitForTimeout(2000) // hold the final state on screen
  } finally {
    await finishApprover2()
    await finish()
  }
})
