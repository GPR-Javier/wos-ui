import { test, expect } from "@playwright/test"
import {
  slug,
  setupSplitScreen,
  setupCoApprover,
  fileLeave,
  openBellAndClickNotification,
} from "./_harness"

/**
 * CO-APPROVER "HANDLED" NOTIFICATION journey (Leave).
 *
 * Backend feature (wos-hr, FE-transparent): when a request has MORE THAN ONE approver,
 * the moment one approver acts (approve/reject/return) the OTHER approvers — the
 * requester's reporting-line leads plus the company's admins — receive an in-app
 * "Leave request handled … No action needed." notification so their pending list can be
 * cleared. The requester still gets the normal outcome notice; the acting reviewer is
 * excluded. No leave FE code exists for this — it renders through the NotificationBell.
 *
 * This proves it end-to-end for LEAVE, THROUGH THE NOTIFICATION BELL:
 *   employee files a LEAVE request
 *     → admin (approver #1) approves it
 *     → admin2 (approver #2) sees "Leave request handled" in their bell — clicking it
 *        lands on /dashboard/leave — AND the request has dropped off their PENDING list.
 *
 * WHY TWO COMPANY ADMINS (not a lead + admin): the recipient set for the "handled" notice
 * is (requester's reporting-line leads ∪ company admins) − requester − actor. Company
 * admins are ALWAYS recipients and can ALWAYS reach the leave management table, so a
 * second admin is the most permission-robust "other approver" to drive from the UI.
 *
 * SETUP: needs a SECOND password-based company admin in the SAME company as `admin`
 * (E2E_ADMIN2_EMAIL / E2E_ADMIN2_PASSWORD → e2e/.auth/admin2.json). Without those creds the
 * test self-skips (and setup-admin2 no-ops). The filing employee must have leave credits
 * for the default VACATION type. Creates a REAL leave each run (unique `reason`).
 * Run: pnpm e2e:journey · review: pnpm e2e:report.
 */
test("employee files leave → admin approves → the OTHER approver is notified it was handled", async () => {
  test.skip(
    !process.env.E2E_ADMIN2_EMAIL || !process.env.E2E_ADMIN2_PASSWORD,
    "Set E2E_ADMIN2_EMAIL / E2E_ADMIN2_PASSWORD (a second company admin) to run the co-approver journey."
  )
  test.setTimeout(180_000)

  const { employee, admin, finish } = await setupSplitScreen(test.info())
  const { page: approver2, finish: finishApprover2 } = await setupCoApprover(
    test.info()
  )
  const reason = `E2E co-approver LEAVE ${Date.now()}`

  try {
    // 1. Employee files the leave, then leaves the page. `date` is the request's start
    //    day — the value shown in the admin table's "From" column, used to find the row.
    const date = await fileLeave(employee, reason)
    await employee.goto(`/${slug}/dashboard`)

    // 2. The SECOND approver confirms the request IS on their pending list first — this is
    //    the row we expect to disappear once the other approver acts.
    await approver2.goto(`/${slug}/dashboard/leave`)
    await approver2.getByRole("button", { name: "Pending" }).click()
    await expect(
      approver2.getByTestId("leave-mgmt-row").filter({ hasText: date })
    ).toBeVisible({ timeout: 15_000 })
    // Park on a neutral page so the later "handled" notif click is a real redirect to /leave.
    await approver2.goto(`/${slug}/dashboard`)

    // 3. Approver #1 (admin) opens the leave table and approves the pending request.
    //    Leave approval is a direct action (no review modal), so one click resolves it.
    await admin.goto(`/${slug}/dashboard/leave`)
    await admin.getByRole("button", { name: "Pending" }).click()
    const adminRow = admin
      .getByTestId("leave-mgmt-row")
      .filter({ hasText: date })
    await expect(adminRow).toBeVisible({ timeout: 15_000 })
    await adminRow.getByTestId("leave-approve").click()
    // The row leaves the Pending view once approved.
    await expect(adminRow).toBeHidden({ timeout: 15_000 })

    // 4a. The OTHER approver receives "Leave request handled" (the co-approver notice);
    //     clicking it lands on /dashboard/leave. This is the core assertion of the feature.
    await openBellAndClickNotification(
      approver2,
      "Leave request handled",
      new RegExp(`/${slug}/dashboard/leave`)
    )

    // 4b. …and the request has dropped off their PENDING list — it's APPROVED now, so it is
    //     no longer actionable by the second approver.
    await approver2.getByRole("button", { name: "Pending" }).click()
    await expect(
      approver2.getByTestId("leave-mgmt-row").filter({ hasText: date })
    ).toHaveCount(0, { timeout: 15_000 })

    await approver2.waitForTimeout(2000) // hold the final state on screen
  } finally {
    await finishApprover2()
    await finish()
  }
})
