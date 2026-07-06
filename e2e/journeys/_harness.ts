import {
  expect,
  chromium,
  type Page,
  type Locator,
  type TestInfo,
  type BrowserContext,
} from "@playwright/test"

// Shared helpers for the dual-role split-screen journeys. NOT a spec file (no
// `.spec` suffix) so Playwright's testMatch ("**/journeys/**/*.spec.ts") ignores it.

export const slug = process.env.E2E_SLUG ?? "gpr"
export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const HALF = Number(process.env.E2E_SPLIT_WIDTH ?? 940) // per-window width (px)
const VIEWPORT = { width: HALF - 20, height: 940 }

/**
 * Suppresses the first-run onboarding tour for a context. The tour renders coachmark
 * overlays that intercept clicks and wedge the journeys; `useScreenOnboarding` bails when
 * this localStorage flag is set. addInitScript runs before app JS on every navigation, so
 * the flag is present before React mounts (and survives the /me re-hydration of onboarding).
 */
async function disableOnboarding(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem("wos_e2e_no_onboarding", "1")
    } catch {
      /* storage unavailable — tour will simply show, non-fatal */
    }
  })
}

/**
 * Opens the notification bell and clicks the newest notification whose title matches,
 * asserting it redirects to `expectUrl`. Retries (reopening the bell) so it tolerates
 * SSE-delivery lag. This is the real cross-role signal: the OTHER role's action raised
 * this notification, and clicking it navigates the recipient to the right page.
 */
export async function openBellAndClickNotification(
  page: Page,
  title: string,
  expectUrl: RegExp
) {
  const bell = page.getByTestId("notification-bell")
  await expect(bell).toBeVisible({ timeout: 15_000 })
  for (let attempt = 0; attempt < 15; attempt++) {
    await page.keyboard.press("Escape").catch(() => {}) // ensure the dropdown is closed
    await bell.click() // open it fresh
    const item = page
      .getByTestId("notification-item")
      .filter({ hasText: title })
      .first()
    if (await item.isVisible().catch(() => false)) {
      await item.click()
      // Retry the whole thing if the click didn't navigate (missed click under load,
      // or the notification hadn't been SSE-delivered yet so we clicked a stale one).
      const navigated = await page
        .waitForURL(expectUrl, { timeout: 5_000 })
        .then(() => true)
        .catch(() => false)
      if (navigated) return
    }
    await page.waitForTimeout(1500) // wait for delivery / settle, then retry
  }
  throw new Error(
    `Notification "${title}" didn't appear or didn't navigate to ${expectUrl}.`
  )
}

/**
 * Fills the OB date field with the first date the availability pre-check accepts —
 * not a rest day / approved leave / holiday / existing approved OB (the modal disables
 * Submit for blocked dates). Tries every day from today forward until Submit enables.
 * Override with E2E_OB_DATE=YYYY-MM-DD. (purpose + location must be filled first.)
 */
export async function pickAvailableDate(
  dateInput: Locator,
  submitBtn: Locator
) {
  const override = process.env.E2E_OB_DATE
  if (override) {
    await dateInput.fill(override)
    return override
  }
  const d = new Date() // today is fileable; backend only rejects PAST
  for (let i = 0; i < 180; i++) {
    const iso = d.toLocaleDateString("en-CA")
    await dateInput.fill(iso)
    await submitBtn.page().waitForTimeout(400) // let the pre-check recompute dateError
    // Confirm the enabled state is STABLE (guards against reading mid-recompute).
    if ((await submitBtn.isEnabled()) && (await submitBtn.isEnabled()))
      return iso
    d.setDate(d.getDate() + 1) // blocked — try the next day
  }
  throw new Error(
    "No available OB date found in the next 180 days (all blocked by leave/holiday/rest-day). Set E2E_OB_DATE to a known-free date."
  )
}

/**
 * Files an OB as the employee (on /my-or): opens the modal, fills purpose + location,
 * picks the first available date, submits, and confirms the row is listed. Returns the
 * chosen date. Leaves the employee on /my-or.
 */
export async function fileOb(employee: Page, purpose: string) {
  await employee.goto(`/${slug}/dashboard/my-or`)

  // The modal's availability pre-check fires 4 GETs on open. WAIT for them before
  // evaluating any date — otherwise we'd read the Submit button while the data is still
  // loading (dateError not yet computed → button briefly enabled) and pick a date that's
  // actually blocked (e.g. the employee is on approved leave), which the backend then
  // rejects. Registered before the click; best-effort so a cached/304 response can't stall it.
  const preChecks = [
    "/hr/attendance/me/policy",
    "/hr/leave-requests/me",
    "/hr/holidays",
    "/hr/ob-requests/me",
  ].map((u) =>
    employee
      .waitForResponse(
        (r) => r.url().includes(u) && r.request().method() === "GET",
        {
          timeout: 30_000,
        }
      )
      .catch(() => null)
  )
  await employee.getByTestId("ob-new-request").click()
  await Promise.all(preChecks)

  await employee.getByTestId("ob-purpose").fill(purpose)
  await employee.getByTestId("ob-location").fill("BGC (E2E)")
  const submitBtn = employee.getByTestId("ob-submit")
  const chosen = await pickAvailableDate(
    employee.getByTestId("ob-date"),
    submitBtn
  )
  await submitBtn.click()
  // Generous timeout: the FIRST create hits the Next dev proxy route cold (Turbopack
  // compiles /api/[...path] on demand), so the POST can take 10-15s before the modal closes.
  await expect(submitBtn).toBeHidden({ timeout: 30_000 })
  await expect(employee.getByText(purpose)).toBeVisible({ timeout: 15_000 })
  return chosen
}

/**
 * Selects a SINGLE-day leave range in the modal's real calendar popover: opens the
 * picker, pages forward until the target ISO day is on screen, then clicks it twice
 * (first click = start, second click on the same day = commit → single-day range).
 */
async function selectSingleLeaveDay(employee: Page, iso: string) {
  await employee
    .getByTestId("leave-daterange")
    .locator("button")
    .first()
    .click()
  let day = employee.getByTestId(`drp-day-${iso}`)
  for (let i = 0; i < 14 && (await day.count()) === 0; i++) {
    await employee.getByRole("button", { name: "Next month" }).click()
    day = employee.getByTestId(`drp-day-${iso}`)
  }
  await day.click() // start
  await day.click() // end (same day) → commits + closes the popover
}

/**
 * Files a LEAVE request as the employee (on /my-leaves): opens the modal, fills the
 * reason, then picks the first single day the modal accepts (Submit enables) — skipping
 * rest days / holidays. Submits and confirms the row is listed. Returns the chosen ISO
 * date (the admin table's "From" column, used to locate the row). Analogue of `fileOb`.
 *
 * Override the starting day with E2E_LEAVE_DATE=YYYY-MM-DD. The employee must have leave
 * credits for the default VACATION type (Submit stays disabled on insufficient balance).
 */
export async function fileLeave(employee: Page, reason: string) {
  await employee.goto(`/${slug}/dashboard/my-leaves`)

  // Opening the modal fires the availability pre-checks (balances / policy / holidays).
  // WAIT for them before evaluating Submit, so we don't read the button mid-load.
  const preChecks = [
    "/hr/employee/leave-balances",
    "/hr/attendance/me/policy",
    "/hr/holidays",
  ].map((u) =>
    employee
      .waitForResponse(
        (r) => r.url().includes(u) && r.request().method() === "GET",
        { timeout: 30_000 }
      )
      .catch(() => null)
  )
  await employee.getByTestId("leave-new-request").click()
  await Promise.all(preChecks)

  await employee.getByTestId("leave-reason").fill(reason)

  const submitBtn = employee.getByTestId("leave-submit")
  const override = process.env.E2E_LEAVE_DATE
  const cursor = override
    ? new Date(`${override}T00:00:00`)
    : (() => {
        const d = new Date()
        d.setDate(d.getDate() + 14) // a couple weeks out — clear of "must file in advance"
        return d
      })()

  let chosen = ""
  for (let i = 0; i < 60; i++) {
    const iso = cursor.toLocaleDateString("en-CA")
    await selectSingleLeaveDay(employee, iso)
    await employee.waitForTimeout(400) // let the per-day pre-check recompute
    if ((await submitBtn.isEnabled()) && (await submitBtn.isEnabled())) {
      chosen = iso
      break
    }
    cursor.setDate(cursor.getDate() + 1) // blocked (rest day / holiday / no credit) — next day
  }
  if (!chosen) {
    throw new Error(
      "No fileable leave day found in 60 days. Set E2E_LEAVE_DATE to a known-free day and ensure the employee has leave credits."
    )
  }

  await submitBtn.click()
  // Generous timeout: the FIRST create hits the Next dev proxy route cold (Turbopack
  // compiles /api/[...path] on demand), so the POST can take 10-15s before the modal closes.
  await expect(submitBtn).toBeHidden({ timeout: 30_000 })
  await expect(employee.getByText(reason)).toBeVisible({ timeout: 15_000 })
  return chosen
}

export interface SplitScreen {
  employee: Page
  admin: Page
  /** Stops tracing, closes both browsers, and attaches per-role video + trace to the report. */
  finish: () => Promise<void>
}

export interface ApproverWindow {
  page: Page
  /** Stops tracing, closes the browser, and attaches this approver's video + trace. */
  finish: () => Promise<void>
}

/**
 * Launches a THIRD headed window for a SECOND approver — a distinct company admin loaded
 * from e2e/.auth/admin2.json — recording its own video + trace. Used only by the
 * co-approver journey to prove the "Official business handled / No action needed" notice
 * reaches the OTHER approver after the first approver acts. Positioned below the two
 * split-screen windows so all three are visible. Call finish() in the journey's finally.
 */
export async function setupCoApprover(info: TestInfo): Promise<ApproverWindow> {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-position=${Math.round(HALF / 2)},120`,
      `--window-size=${HALF},1040`,
    ],
  })
  const ctx = await browser.newContext({
    baseURL: BASE,
    storageState: "e2e/.auth/admin2.json",
    viewport: VIEWPORT,
    recordVideo: { dir: info.outputPath("video-approver2"), size: VIEWPORT },
  })
  await disableOnboarding(ctx)
  await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true })
  const page = await ctx.newPage()

  const finish = async () => {
    const trace = info.outputPath("approver2-trace.zip")
    await ctx.tracing.stop({ path: trace }).catch(() => {})
    const video = page.video()?.path()
    await browser.close()
    await info
      .attach("approver2-trace", {
        path: trace,
        contentType: "application/zip",
      })
      .catch(() => {})
    const v = await video?.catch(() => undefined)
    if (v)
      await info
        .attach("approver2-video", { path: v, contentType: "video/webm" })
        .catch(() => {})
  }

  return { page, finish }
}

/**
 * Launches two side-by-side headed browsers (employee LEFT, admin RIGHT), each in its
 * own context loaded from the saved session, recording video + a trace. Call `finish()`
 * in a finally block to tear down and attach the artifacts to the HTML report.
 */
export async function setupSplitScreen(info: TestInfo): Promise<SplitScreen> {
  const employeeBrowser = await chromium.launch({
    headless: false,
    args: ["--window-position=0,0", `--window-size=${HALF},1040`],
  })
  const adminBrowser = await chromium.launch({
    headless: false,
    args: [`--window-position=${HALF},0`, `--window-size=${HALF},1040`],
  })

  const employeeCtx = await employeeBrowser.newContext({
    baseURL: BASE,
    storageState: "e2e/.auth/employee.json",
    viewport: VIEWPORT,
    recordVideo: { dir: info.outputPath("video-employee"), size: VIEWPORT },
  })
  const adminCtx = await adminBrowser.newContext({
    baseURL: BASE,
    storageState: "e2e/.auth/admin.json",
    viewport: VIEWPORT,
    recordVideo: { dir: info.outputPath("video-admin"), size: VIEWPORT },
  })

  await disableOnboarding(employeeCtx)
  await disableOnboarding(adminCtx)

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

  const employee = await employeeCtx.newPage()
  const admin = await adminCtx.newPage()

  const finish = async () => {
    const empTrace = info.outputPath("employee-trace.zip")
    const admTrace = info.outputPath("admin-trace.zip")
    await Promise.allSettled([
      employeeCtx.tracing.stop({ path: empTrace }),
      adminCtx.tracing.stop({ path: admTrace }),
    ])
    const empVideo = employee.video()?.path()
    const admVideo = admin.video()?.path()
    await employeeBrowser.close()
    await adminBrowser.close()
    await info.attach("employee-trace", {
      path: empTrace,
      contentType: "application/zip",
    })
    await info.attach("admin-trace", {
      path: admTrace,
      contentType: "application/zip",
    })
    const ev = await empVideo?.catch(() => undefined)
    const av = await admVideo?.catch(() => undefined)
    if (ev)
      await info.attach("employee-video", {
        path: ev,
        contentType: "video/webm",
      })
    if (av)
      await info.attach("admin-video", { path: av, contentType: "video/webm" })
  }

  return { employee, admin, finish }
}
