import { test, expect } from "@playwright/test"
import {
  slug,
  setupSplitScreen,
  setupCoApprover,
  fileOvertime,
  openBellAndClickNotification,
} from "./_harness"

/**
 * CO-APPROVER "HANDLED" NOTIFICATION journey (Overtime).
 *
 * Backend feature (wos-hr, FE-transparent): when a request has MORE THAN ONE approver,
 * the moment one approver acts (authorize/approve/reject/return) the OTHER approvers — the
 * requester's reporting-line leads plus the company's admins — receive an in-app
 * "Overtime request handled … No action needed." notification so their pending list can be
 * cleared. The requester still gets the normal outcome notice; the acting reviewer is
 * excluded. No overtime FE code exists for this — it renders through the NotificationBell.
 *
 * PHASE DRIVEN: this exercises PHASE 1 (authorization) of the two-phase overtime flow. The
 * employee files a pre-authorization (PENDING_AUTH) — the simplest reviewable state, needing
 * no logged attendance — and approver #1 AUTHORIZES it from the "Authorizations" queue. On
 * that action the co-approver notice fires and the row drops off (it becomes AUTHORIZED,
 * which is no longer in the authorization queue). The identical notification path also
 * covers the Phase-2 claim review; Phase 1 is chosen only because it's the cheapest to seed.
 *
 * This proves it end-to-end for OVERTIME, THROUGH THE NOTIFICATION BELL:
 *   employee files an OVERTIME authorization
 *     → admin (approver #1) authorizes it
 *     → admin2 (approver #2) sees "Overtime request handled" in their bell — clicking it
 *        lands on /dashboard/overtime — AND the request has dropped off their PENDING list.
 *
 * WHY TWO COMPANY ADMINS (not a lead + admin): the recipient set for the "handled" notice
 * is (requester's reporting-line leads ∪ company admins) − requester − actor. Company
 * admins are ALWAYS recipients and can ALWAYS reach the overtime management table, so a
 * second admin is the most permission-robust "other approver" to drive from the UI.
 *
 * SETUP: needs a SECOND password-based company admin in the SAME company as `admin`
 * (E2E_ADMIN2_EMAIL / E2E_ADMIN2_PASSWORD → e2e/.auth/admin2.json). Without those creds the
 * test self-skips (and setup-admin2 no-ops). The overtime AUTHORIZATION endpoint must accept
 * a Phase-1 filing for the employee (see the SEED note below). Creates a REAL overtime
 * request each run (unique `reason`). Run: pnpm e2e:journey · review: pnpm e2e:report.
 *
 * SEED / CONFIG the reset endpoint must provide for this journey (do NOT hack around a gap):
 *  - a SCHEDULE POLICY for the filing employee (the authorize dialog's day-guide reads
 *    /hr/attendance/me/policy; the server classifies the rate type from the schedule). Filing
 *    itself only needs a future/today date + a ≥1h window + a reason, so a missing policy will
 *    not block the modal — but the backend authorization create may 4xx without one.
 *  - overtime RATE config is NOT required for Phase 1 (the UI states the classification is
 *    "confirmed at claim time"); it would only matter for a Phase-2 claim → payroll sync.
 *  If the POST /hr/overtime-requests/authorizations fails for lack of seed data, add the
 *  employee's schedule policy to the reset/seed rather than working around it here.
 */
test("employee files overtime → admin authorizes → the OTHER approver is notified it was handled", async () => {
  test.skip(
    !process.env.E2E_ADMIN2_EMAIL || !process.env.E2E_ADMIN2_PASSWORD,
    "Set E2E_ADMIN2_EMAIL / E2E_ADMIN2_PASSWORD (a second company admin) to run the co-approver journey."
  )
  test.setTimeout(180_000)

  const { employee, admin, finish } = await setupSplitScreen(test.info())
  const { page: approver2, finish: finishApprover2 } = await setupCoApprover(
    test.info()
  )
  const reason = `E2E co-approver OT ${Date.now()}`

  try {
    // 1. Employee files the overtime authorization (Phase 1), then leaves the page.
    await fileOvertime(employee, reason)
    await employee.goto(`/${slug}/dashboard`)

    // 2. The SECOND approver confirms the request IS on their pending list first — this is
    //    the row we expect to disappear once the other approver acts. PENDING_AUTH lives in
    //    the "Authorizations" queue of the overtime management table.
    await approver2.goto(`/${slug}/dashboard/overtime`)
    await approver2.getByRole("button", { name: /Authorizations/ }).click()
    await expect(
      approver2.getByRole("row").filter({ hasText: reason })
    ).toBeVisible({ timeout: 15_000 })
    // Park on a neutral page so the later "handled" notif click is a real redirect to /overtime.
    await approver2.goto(`/${slug}/dashboard`)

    // 3. Approver #1 (admin) opens the overtime table, switches to the authorization queue,
    //    and authorizes the pending request via the review modal (Phase-1 "Authorize").
    await admin.goto(`/${slug}/dashboard/overtime`)
    await admin.getByRole("button", { name: /Authorizations/ }).click()
    const adminRow = admin.getByRole("row").filter({ hasText: reason })
    await expect(adminRow).toBeVisible({ timeout: 15_000 })
    await adminRow.getByRole("button", { name: "Approve" }).click()
    const authorizeBtn = admin
      .getByRole("dialog")
      .getByRole("button", { name: "Authorize" })
    await authorizeBtn.click()
    await expect(authorizeBtn).toBeHidden({ timeout: 15_000 })

    // 4a. The OTHER approver receives "Overtime request handled" (the co-approver notice);
    //     clicking it lands on /dashboard/overtime. This is the core assertion of the feature.
    await openBellAndClickNotification(
      approver2,
      "Overtime request handled",
      new RegExp(`/${slug}/dashboard/overtime`)
    )

    // 4b. …and the request has dropped off their PENDING list — it's AUTHORIZED now, so it is
    //     no longer in the authorization queue for the second approver.
    await approver2.getByRole("button", { name: /Authorizations/ }).click()
    await expect(
      approver2.getByRole("row").filter({ hasText: reason })
    ).toHaveCount(0, { timeout: 15_000 })

    await approver2.waitForTimeout(2000) // hold the final state on screen
  } finally {
    await finishApprover2()
    await finish()
  }
})
