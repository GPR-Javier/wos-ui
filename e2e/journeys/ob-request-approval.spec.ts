import {
  test,
  expect,
  chromium,
  type BrowserContext,
  type Page,
  type Locator,
} from "@playwright/test"

/**
 * DUAL-ROLE SPLIT-SCREEN journey — watch the employee and admin talk to each other:
 *   employee files an OB  →  admin approves it  →  employee's screen flips to Approved
 * (that last step exercises the real notification-driven refetch, no manual reload).
 *
 * Two side-by-side headed windows: employee on the LEFT, admin on the RIGHT.
 * Run with:  pnpm e2e:journey     then review with:  pnpm e2e:report
 *
 * REVIEWABLE UI: each role records a video + a Playwright trace, both ATTACHED to
 * the HTML report — play each side and scrub each role's trace in the trace viewer.
 *
 * Prereqs: the app running + a password-based employee with FILE_OB permission.
 * NOTE: creates a REAL OB request each run (unique `purpose` marker).
 */

const slug = process.env.E2E_SLUG ?? "gpr"
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const HALF = Number(process.env.E2E_SPLIT_WIDTH ?? 940) // per-window width (px)
const VIEWPORT = { width: HALF - 20, height: 940 }

/**
 * Fills the OB date field with the first date the availability pre-check accepts —
 * i.e. not a rest day / approved leave / holiday / existing approved OB (the modal
 * disables Submit and shows a reason for blocked dates). Tries EVERY day in order:
 * today, then tomorrow, then the next day, … until Submit enables.
 * Override with E2E_OB_DATE=YYYY-MM-DD if you already know a free date.
 * (purpose + location must be filled first, so Submit's enabled state reflects only
 * the date constraint.)
 */
/**
 * Opens the notification bell and clicks the newest notification whose title matches,
 * asserting it redirects to `expectUrl`. Retries (reopening the bell) so it tolerates
 * SSE-delivery lag. This is the real cross-role signal: the OTHER role's action raised
 * this notification, and clicking it navigates the recipient to the right page.
 */
async function openBellAndClickNotification(
  page: Page,
  title: string,
  expectUrl: RegExp
) {
  const bell = page.getByTestId("notification-bell")
  await expect(bell).toBeVisible({ timeout: 15_000 })
  for (let attempt = 0; attempt < 12; attempt++) {
    await bell.click() // open the dropdown
    const item = page
      .getByTestId("notification-item")
      .filter({ hasText: title })
      .first()
    if (await item.isVisible().catch(() => false)) {
      await item.click()
      await expect(page).toHaveURL(expectUrl, { timeout: 10_000 })
      return
    }
    await page.keyboard.press("Escape").catch(() => {}) // close, then wait for delivery
    await page.waitForTimeout(1500)
  }
  throw new Error(`Notification "${title}" never appeared in the bell.`)
}

async function pickAvailableDate(dateInput: Locator, submitBtn: Locator) {
  const override = process.env.E2E_OB_DATE
  if (override) {
    await dateInput.fill(override)
    return override
  }
  const d = new Date() // start today (today is fileable; backend only rejects PAST)
  for (let i = 0; i < 180; i++) {
    const iso = d.toLocaleDateString("en-CA")
    await dateInput.fill(iso)
    await submitBtn.page().waitForTimeout(250) // let the pre-check recompute
    if (await submitBtn.isEnabled()) return iso
    d.setDate(d.getDate() + 1) // blocked — try the next day
  }
  throw new Error(
    "No available OB date found in the next 180 days (all blocked by leave/holiday/rest-day). Set E2E_OB_DATE to a known-free date."
  )
}

test("employee files OB → admin approves → employee sees it approved", async () => {
  test.setTimeout(180_000)

  const employeeBrowser = await chromium.launch({
    headless: false,
    args: ["--window-position=0,0", `--window-size=${HALF},1040`],
  })
  const adminBrowser = await chromium.launch({
    headless: false,
    args: [`--window-position=${HALF},0`, `--window-size=${HALF},1040`],
  })

  const employeeCtx: BrowserContext = await employeeBrowser.newContext({
    baseURL: BASE,
    storageState: "e2e/.auth/employee.json",
    viewport: VIEWPORT,
    recordVideo: {
      dir: test.info().outputPath("video-employee"),
      size: VIEWPORT,
    },
  })
  const adminCtx: BrowserContext = await adminBrowser.newContext({
    baseURL: BASE,
    storageState: "e2e/.auth/admin.json",
    viewport: VIEWPORT,
    recordVideo: { dir: test.info().outputPath("video-admin"), size: VIEWPORT },
  })

  await employeeCtx.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  })
  await adminCtx.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  })

  const employee: Page = await employeeCtx.newPage()
  const admin: Page = await adminCtx.newPage()
  const purpose = `E2E split-screen OB ${Date.now()}` // unique marker for this run

  try {
    // ── 1. EMPLOYEE files an OB (left window) ──────────────────────────────
    await employee.goto(`/${slug}/dashboard/my-or`)
    await employee.getByTestId("ob-new-request").click()
    await employee.getByTestId("ob-purpose").fill(purpose)
    await employee.getByTestId("ob-location").fill("BGC (E2E)")
    const submitBtn = employee.getByTestId("ob-submit")
    const chosen = await pickAvailableDate(
      employee.getByTestId("ob-date"),
      submitBtn
    )
    // eslint-disable-next-line no-console
    console.log(`📅 Filing OB for ${chosen}`)
    await submitBtn.click()
    await expect(submitBtn).toBeHidden()
    await expect(employee.getByText(purpose)).toBeVisible()
    // Move the employee OFF the OB page, so the approval notification later is a real redirect.
    await employee.goto(`/${slug}/dashboard`)

    // ── 2. ADMIN reaches the OB page VIA the notification, then approves ─────
    // Filing raised an "Official business request" notification to the admins.
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

    // ── 3. EMPLOYEE gets the approval notification → clicks it → lands on my-or ─
    // Approval raised an "Official business approved" notification to the requester.
    await openBellAndClickNotification(
      employee,
      "Official business approved",
      new RegExp(`/${slug}/dashboard/my-or`)
    )
    const empRow = employee.getByTestId("ob-row").filter({ hasText: purpose })
    await expect(empRow.getByText("Approved")).toBeVisible({ timeout: 10_000 })

    await employee.waitForTimeout(2500) // hold the final state on both screens
  } finally {
    const empTrace = test.info().outputPath("employee-trace.zip")
    const admTrace = test.info().outputPath("admin-trace.zip")
    await Promise.allSettled([
      employeeCtx.tracing.stop({ path: empTrace }),
      adminCtx.tracing.stop({ path: admTrace }),
    ])
    const empVideo = employee.video()?.path()
    const admVideo = admin.video()?.path()
    await employeeBrowser.close()
    await adminBrowser.close()

    await test
      .info()
      .attach("employee-trace", {
        path: empTrace,
        contentType: "application/zip",
      })
    await test
      .info()
      .attach("admin-trace", { path: admTrace, contentType: "application/zip" })
    const ev = await empVideo?.catch(() => undefined)
    const av = await admVideo?.catch(() => undefined)
    if (ev)
      await test
        .info()
        .attach("employee-video", { path: ev, contentType: "video/webm" })
    if (av)
      await test
        .info()
        .attach("admin-video", { path: av, contentType: "video/webm" })
  }
})
