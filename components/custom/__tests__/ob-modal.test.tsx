import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ObRequest } from "@/lib/ob-api"

// Spy mutate fns + the mutable data the four date pre-check queries read, shared
// with the mocked modules. Each `*Data` holder starts empty/undefined so the
// corresponding constraint stays dormant; individual specs mutate one to arm it.
const {
  createMutate,
  updateMutate,
  approvedOb,
  policyData,
  leaveData,
  holidaysData,
} = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  approvedOb: { content: [] as Array<{ id: number; obDate: string }> },
  policyData: { current: undefined as { workdays: string[] } | undefined },
  leaveData: {
    current: undefined as
      | { content: Array<{ startDate: string; endDate: string }> }
      | undefined,
  },
  holidaysData: {
    current: undefined as
      | Array<{ date: string; active: boolean; recurring: boolean }>
      | undefined,
  },
}))

vi.mock("@/hooks/use-ob", () => ({
  useCreateObRequest: () => ({ mutate: createMutate, isPending: false }),
  useUpdateObRequest: () => ({ mutate: updateMutate, isPending: false }),
  // The date pre-check queries approved OB requests; feed it the hoisted rows.
  useMyObRequests: () => ({ data: approvedOb }),
}))

// The remaining pre-check hooks: return the current hoisted holder so specs can
// arm the rest-day / holiday / approved-leave branches at will.
vi.mock("@/hooks/use-schedule-policy", () => ({
  useMyPolicy: () => ({ data: policyData.current }),
}))
vi.mock("@/hooks/use-leave", () => ({
  useMyLeaveRequests: () => ({ data: leaveData.current }),
}))
vi.mock("@/hooks/use-holidays", () => ({
  useHolidays: () => ({ data: holidaysData.current }),
}))

import { ObModal } from "@/components/custom/ob-modal"

// Local Y-M-D — must match the component (which uses toLocaleDateString("en-CA")).
const today = new Date().toLocaleDateString("en-CA")
const WEEKDAY_BY_INDEX = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const todayWeekday = WEEKDAY_BY_INDEX[new Date(today + "T00:00:00").getDay()]

function renderModal(
  props: Partial<React.ComponentProps<typeof ObModal>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ObModal open onClose={() => {}} {...props} />
    </QueryClientProvider>
  )
}

/** Fill the three always-required fields (purpose, location, OB date). */
function fillRequired(date = today) {
  fireEvent.change(
    screen.getByPlaceholderText(/Client meeting, training, conference/i),
    { target: { value: "Client meeting" } }
  )
  fireEvent.change(screen.getByPlaceholderText(/Makati office, BGC, Remote/i), {
    target: { value: "BGC" },
  })
  const dateInput = document.querySelector(
    'input[type="date"]'
  ) as HTMLInputElement
  fireEvent.change(dateInput, { target: { value: date } })
}

describe("ObModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    approvedOb.content = []
    policyData.current = undefined
    leaveData.current = undefined
    holidaysData.current = undefined
  })

  it("(b) the OB date input's min attribute equals today's local date", () => {
    renderModal()
    const dateInput = document.querySelector(
      'input[type="date"]'
    ) as HTMLInputElement
    expect(dateInput).toBeInTheDocument()
    expect(dateInput.getAttribute("min")).toBe(today)
  })

  it("(a) selecting CUSTOM reveals the two time inputs; Submit stays blocked until both are set", () => {
    renderModal()

    // Time inputs not present under the default FULL_DAY duration.
    expect(document.querySelectorAll('input[type="time"]').length).toBe(0)

    fillRequired()
    fireEvent.click(screen.getByRole("button", { name: /Custom Hours/i }))

    // Two time inputs now revealed.
    const timeInputs = document.querySelectorAll('input[type="time"]')
    expect(timeInputs.length).toBe(2)

    // With CUSTOM but no times, Submit is blocked and create is never called.
    const submitBtn = screen.getByRole("button", { name: /Submit Request/i })
    expect(submitBtn).toBeDisabled()
    fireEvent.click(submitBtn)
    expect(createMutate).not.toHaveBeenCalled()

    // Fill only the start time — still blocked.
    fireEvent.change(timeInputs[0], { target: { value: "09:00" } })
    expect(submitBtn).toBeDisabled()

    // Fill the end time too — now allowed.
    fireEvent.change(timeInputs[1], { target: { value: "12:00" } })
    expect(submitBtn).toBeEnabled()
  })

  it("(c) 'Save as Draft' sends isDraft:true and 'Submit Request' sends isDraft falsy", () => {
    renderModal()
    fillRequired()

    fireEvent.click(screen.getByRole("button", { name: /Save as Draft/i }))
    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(createMutate.mock.calls[0][0]).toMatchObject({ isDraft: true })

    createMutate.mockClear()

    fireEvent.click(screen.getByRole("button", { name: /Submit Request/i }))
    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(createMutate.mock.calls[0][0].isDraft).toBeFalsy()
  })

  it("(d) picking a date that already has an approved OB shows the error and blocks Submit + Draft", () => {
    approvedOb.content = [{ id: 99, obDate: today }]
    renderModal()
    fillRequired() // sets OB date = today, which now collides with an approved OB

    expect(
      screen.getByText(/already have an approved OB request for this date/i)
    ).toBeInTheDocument()

    const submitBtn = screen.getByRole("button", { name: /Submit Request/i })
    const draftBtn = screen.getByRole("button", { name: /Save as Draft/i })
    expect(submitBtn).toBeDisabled()
    expect(draftBtn).toBeDisabled()

    fireEvent.click(submitBtn)
    fireEvent.click(draftBtn)
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("(e) an approved OB on a DIFFERENT date does not block today's request", () => {
    approvedOb.content = [{ id: 99, obDate: "2020-01-01" }]
    renderModal()
    fillRequired()

    expect(
      screen.queryByText(/already have an approved OB request/i)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Submit Request/i })
    ).toBeEnabled()
  })

  // ── Rest-day pre-check ──────────────────────────────────────────────────────

  it("(f) REST DAY: non-empty workdays that exclude the picked weekday blocks Submit", () => {
    // Workdays = every weekday except today's → today is a rest day.
    policyData.current = {
      workdays: WEEKDAY_BY_INDEX.filter((d) => d !== todayWeekday),
    }
    renderModal()
    fillRequired()

    expect(
      screen.getByText(/cannot file OB on your rest day/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Submit Request/i })
    ).toBeDisabled()
  })

  it("(g) REST DAY: empty workdays is NOT treated as a rest day (matches OT semantics)", () => {
    policyData.current = { workdays: [] }
    renderModal()
    fillRequired()

    expect(
      screen.queryByText(/cannot file OB on your rest day/i)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Submit Request/i })
    ).toBeEnabled()
  })

  // ── Holiday pre-check ───────────────────────────────────────────────────────

  it("(h) HOLIDAY: an exact-date active holiday blocks Submit", () => {
    holidaysData.current = [{ date: today, active: true, recurring: false }]
    renderModal()
    fillRequired()

    expect(
      screen.getByText(/cannot file OB on a company holiday/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Submit Request/i })
    ).toBeDisabled()
  })

  it("(i) HOLIDAY: a recurring holiday on the same month/day of another year blocks Submit", () => {
    // Same MM-DD as today but seeded in the year 2000, recurring.
    holidaysData.current = [
      { date: `2000-${today.slice(5)}`, active: true, recurring: true },
    ]
    renderModal()
    fillRequired()

    expect(
      screen.getByText(/cannot file OB on a company holiday/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Submit Request/i })
    ).toBeDisabled()
  })

  // ── Approved-leave pre-check ────────────────────────────────────────────────

  it("(j) APPROVED LEAVE: an approved row whose range covers the date blocks Submit", () => {
    leaveData.current = {
      content: [{ startDate: today, endDate: today }],
    }
    renderModal()
    fillRequired()

    expect(
      screen.getByText(/cannot file OB on a day you are on approved leave/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Submit Request/i })
    ).toBeDisabled()
  })

  // ── Resubmit (RETURNED) ─────────────────────────────────────────────────────

  it("(k) RESUBMIT: a RETURNED request shows 'Resubmit for Approval' and calls UPDATE, not create", () => {
    const editing: ObRequest = {
      id: 42,
      userId: 1,
      userName: "Jane",
      userEmail: "jane@example.com",
      obDate: today,
      duration: "FULL_DAY",
      customStartTime: null,
      customEndTime: null,
      purpose: "Client meeting",
      location: "BGC",
      notes: null,
      status: "RETURNED",
      reviewNote: "Please add the venue.",
      reviewedBy: 2,
      reviewedByName: "Admin",
      reviewedAt: "2026-07-01T00:00:00Z",
      createdAt: "2026-07-01T00:00:00Z",
      updatedAt: "2026-07-01T00:00:00Z",
    }
    renderModal({ editing })

    const resubmitBtn = screen.getByRole("button", {
      name: /Resubmit for Approval/i,
    })
    expect(resubmitBtn).toBeEnabled()

    fireEvent.click(resubmitBtn)
    expect(updateMutate).toHaveBeenCalledTimes(1)
    expect(updateMutate.mock.calls[0][0]).toMatchObject({ id: 42 })
    expect(createMutate).not.toHaveBeenCalled()
  })
})
