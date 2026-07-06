import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { LeaveRequest } from "@/lib/leave-api"
import type { LeaveBalance } from "@/lib/employee-api"

// ── Hoisted, mutable state the mocked hooks/components read on every render ──────
const {
  createMutate,
  updateMutate,
  mutationState,
  balances,
  policy,
  holidays,
  RANGE,
} = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  mutationState: {
    pending: false,
    isError: false,
    error: undefined as unknown,
  },
  balances: { current: [] as unknown[] },
  policy: { current: undefined as { workdays: string[] } | undefined },
  holidays: {
    current: undefined as
      | Array<{
          date: string
          name: string
          active: boolean
          recurring: boolean
        }>
      | undefined,
  },
  // The range the mocked DateRangePicker emits when its "pick-range" button is clicked.
  RANGE: { current: { from: "", until: "" } },
}))

vi.mock("@/hooks/use-leave", () => ({
  useCreateLeaveRequest: () => ({
    mutate: createMutate,
    isPending: mutationState.pending,
    isError: mutationState.isError,
    error: mutationState.error,
  }),
  useUpdateLeaveRequest: () => ({
    mutate: updateMutate,
    isPending: mutationState.pending,
    isError: mutationState.isError,
    error: mutationState.error,
  }),
}))
vi.mock("@/hooks/use-employee", () => ({
  useLeaveBalances: () => ({ data: balances.current }),
}))
vi.mock("@/hooks/use-schedule-policy", () => ({
  useMyPolicy: () => ({ data: policy.current }),
}))
vi.mock("@/hooks/use-holidays", () => ({
  useHolidays: () => ({ data: holidays.current }),
}))

// Replace the calendar popover with a trivial trigger that emits the hoisted RANGE.
vi.mock("@/components/ui/date-range-picker", async () => {
  const R = await import("react")
  return {
    DateRangePicker: ({
      value,
      onChange,
    }: {
      value: { from: string; until: string } | null
      onChange: (v: { from: string; until: string }) => void
    }) =>
      R.createElement(
        "div",
        null,
        R.createElement(
          "button",
          {
            type: "button",
            "data-testid": "pick-range",
            onClick: () => onChange(RANGE.current),
          },
          "pick"
        ),
        R.createElement(
          "span",
          { "data-testid": "range-display" },
          value ? `${value.from}..${value.until}` : "none"
        )
      ),
  }
})

// Replace the Radix Select with a native-ish bridge: each SelectItem renders a
// button (data-testid `opt-<value>`) that calls the parent Select's onValueChange.
vi.mock("@/components/ui/select", async () => {
  const R = await import("react")
  const Ctx = R.createContext<(v: string) => void>(() => {})
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string
      onValueChange: (v: string) => void
      children: React.ReactNode
    }) =>
      R.createElement(
        Ctx.Provider,
        { value: onValueChange },
        R.createElement("div", { "data-select-value": value }, children)
      ),
    SelectTrigger: ({
      children,
      id,
    }: {
      children: React.ReactNode
      id?: string
    }) => R.createElement("div", { id }, children),
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
    SelectItem: ({
      value,
      children,
    }: {
      value: string
      children: React.ReactNode
    }) => {
      const onValueChange = R.useContext(Ctx)
      return R.createElement(
        "button",
        {
          type: "button",
          "data-testid": `opt-${value}`,
          onClick: () => onValueChange(value),
        },
        children
      )
    },
  }
})

import { LeaveModal } from "@/components/custom/leave-modal"

// A weekday-agnostic base date and its schedule weekday code (same formula the modal uses).
const BASE = "2026-06-15"
const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const baseWeekday = WD[new Date(`${BASE}T00:00:00`).getDay()]

function makeLeave(o: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: 1,
    requestCode: "LV-001",
    userId: 7,
    employeeName: "Jane Cruz",
    employeeId: "E-7",
    employeeEmail: "jane@example.com",
    leaveType: "VACATION",
    startDate: BASE,
    endDate: BASE,
    days: 1,
    dayParts: {},
    status: "DRAFT",
    reason: null,
    filedAt: "2026-06-01T00:00:00Z",
    reviewNote: null,
    reviewedByName: null,
    reviewedAt: null,
    ...o,
  }
}

function bal(o: Partial<LeaveBalance> & { type: string }): LeaveBalance {
  return { total: 10, used: 0, pending: 0, remaining: 10, ...o }
}

function renderModal(
  props: Partial<React.ComponentProps<typeof LeaveModal>> = {}
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <LeaveModal open onClose={() => {}} {...props} />
    </QueryClientProvider>
  )
}

/** Emit a range from the mocked picker (defaults to a single BASE day). */
function pick(from = BASE, until = from) {
  RANGE.current = { from, until }
  fireEvent.click(screen.getByTestId("pick-range"))
}

beforeEach(() => {
  vi.clearAllMocks()
  mutationState.pending = false
  mutationState.isError = false
  mutationState.error = undefined
  balances.current = []
  policy.current = undefined
  holidays.current = undefined
  RANGE.current = { from: "", until: "" }
})

describe("LeaveModal — create flow", () => {
  it("shows the create title + default copy and keeps Submit disabled until a range is picked", () => {
    renderModal()
    expect(screen.getByText("File a leave request")).toBeInTheDocument()
    expect(
      screen.getByText(/Your request will be sent to HR for review/i)
    ).toBeInTheDocument()
    const submit = screen.getByTestId("leave-submit")
    expect(submit).toBeDisabled()

    pick()
    expect(submit).toBeEnabled()
  })

  it("submitting a picked single working day POSTs the create payload and closes on success", () => {
    createMutate.mockImplementation(
      (_body: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    const onClose = vi.fn()
    renderModal({ onClose })
    pick()
    // Single working day → "1 day requested" (singular) with no credit pool.
    expect(screen.getByText(/1 day requested/)).toBeInTheDocument()
    expect(screen.getByText(/not deducted from credits/)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("leave-submit"))
    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(createMutate.mock.calls[0][0]).toMatchObject({
      leaveType: "VACATION",
      startDate: BASE,
      endDate: BASE,
      dayParts: {},
      isDraft: false,
    })
    expect(updateMutate).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("'Save as Draft' sends isDraft:true", () => {
    renderModal()
    pick()
    fireEvent.click(screen.getByTestId("leave-save-draft"))
    expect(createMutate.mock.calls[0][0]).toMatchObject({ isDraft: true })
  })

  it("a typed reason is forwarded on submit", () => {
    renderModal()
    pick()
    fireEvent.change(screen.getByTestId("leave-reason"), {
      target: { value: "Family trip" },
    })
    fireEvent.click(screen.getByTestId("leave-submit"))
    expect(createMutate.mock.calls[0][0]).toMatchObject({
      reason: "Family trip",
    })
  })

  it("a half-day override on a working day halves the count and is scoped into dayParts", () => {
    renderModal()
    pick()
    fireEvent.click(screen.getByTestId("opt-HALF_AM"))
    expect(screen.getByText(/0.5 days requested/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("leave-submit"))
    expect(createMutate.mock.calls[0][0]).toMatchObject({
      dayParts: { [BASE]: "HALF_AM" },
    })
  })

  it("explicitly choosing FULL keeps the day whole and omits it from dayParts", () => {
    renderModal()
    pick()
    fireEvent.click(screen.getByTestId("opt-FULL"))
    expect(screen.getByText(/1 day requested/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("leave-submit"))
    expect(createMutate.mock.calls[0][0]).toMatchObject({ dayParts: {} })
  })
})

describe("LeaveModal — credit pools", () => {
  it("MATERNITY has no credit pool → shows 'not deducted from credits'", () => {
    balances.current = [bal({ type: "VACATION", remaining: 5 })]
    renderModal()
    pick()
    fireEvent.click(screen.getByTestId("opt-MATERNITY"))
    expect(screen.getByText(/not deducted from credits/)).toBeInTheDocument()
  })

  it("prefers the FLEXI pool over the type-specific pool", () => {
    balances.current = [
      bal({ type: "FLEXI", remaining: 10 }),
      bal({ type: "VACATION", remaining: 2 }),
    ]
    renderModal()
    pick()
    // FLEXI 10 remaining − 1 day requested → 9 vacation days left after this.
    expect(
      screen.getByText(/9 vacation day\(s\) left after this/)
    ).toBeVisible()
  })

  it("falls back to the type-specific pool when there is no FLEXI", () => {
    balances.current = [bal({ type: "VACATION", remaining: 3 })]
    renderModal()
    pick()
    expect(
      screen.getByText(/2 vacation day\(s\) left after this/)
    ).toBeVisible()
  })

  it("insufficient credit shows the balance error and blocks Submit", () => {
    balances.current = [
      bal({ type: "VACATION", remaining: 1, pending: 0, total: 5 }),
    ]
    renderModal()
    pick(BASE, "2026-06-17") // 3 working days > 1 available
    expect(screen.getByText(/3 days requested/)).toBeInTheDocument()
    expect(
      screen.getByText(/Not enough credit — 1 day\(s\) available/)
    ).toBeInTheDocument()
    const submit = screen.getByTestId("leave-submit")
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(createMutate).not.toHaveBeenCalled()
  })
})

describe("LeaveModal — non-working days (rest days + holidays)", () => {
  it("a rest day (schedule excludes the weekday) is locked and consumes no leave", () => {
    policy.current = { workdays: WD.filter((d) => d !== baseWeekday) }
    renderModal()
    pick()
    expect(screen.getByText("Rest day")).toBeInTheDocument()
    expect(
      screen.getByText(/All selected dates are rest days or holidays/)
    ).toBeInTheDocument()
    expect(screen.getByTestId("leave-submit")).toBeDisabled()
  })

  it("a working day inside the schedule is fileable (workdays include the weekday)", () => {
    policy.current = { workdays: [...WD] }
    renderModal()
    pick()
    expect(screen.queryByText("Rest day")).not.toBeInTheDocument()
    expect(screen.getByTestId("leave-submit")).toBeEnabled()
  })

  it("an exact-date active company holiday is locked and shows its name", () => {
    holidays.current = [
      { date: BASE, name: "Foundation Day", active: true, recurring: false },
    ]
    renderModal()
    pick()
    expect(screen.getByText("Foundation Day")).toBeInTheDocument()
    expect(
      screen.getByText(/All selected dates are rest days or holidays/)
    ).toBeInTheDocument()
  })

  it("a recurring holiday matches by month/day across years", () => {
    holidays.current = [
      {
        date: `2000-${BASE.slice(5)}`,
        name: "Annual Fiesta",
        active: true,
        recurring: true,
      },
    ]
    renderModal()
    pick()
    expect(screen.getByText("Annual Fiesta")).toBeInTheDocument()
  })

  it("an inactive holiday does not lock the day", () => {
    holidays.current = [
      {
        date: BASE,
        name: "Cancelled Holiday",
        active: false,
        recurring: false,
      },
    ]
    renderModal()
    pick()
    expect(screen.queryByText("Cancelled Holiday")).not.toBeInTheDocument()
    expect(screen.getByTestId("leave-submit")).toBeEnabled()
  })
})

describe("LeaveModal — edit / resubmit", () => {
  it("editing a RETURNED request shows the returned banner + revise copy and calls UPDATE", () => {
    updateMutate.mockImplementation(
      (_args: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    const onClose = vi.fn()
    const editing = makeLeave({
      id: 42,
      leaveType: "VACATION",
      status: "RETURNED",
      reviewNote: "Please attach the medical certificate.",
      days: 1,
    })
    balances.current = [bal({ type: "VACATION", remaining: 5 })]
    renderModal({ editing, onClose })

    expect(screen.getByText("Edit leave request")).toBeInTheDocument()
    expect(
      screen.getByText(/Revise and resubmit — it goes back to HR for review/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Please attach the medical certificate/)
    ).toBeInTheDocument()
    // No draft button while editing.
    expect(screen.queryByTestId("leave-save-draft")).not.toBeInTheDocument()
    // Editing adds the request's own days back into availability: 5 − 1 + 1 = 5, −1 = 4… wait
    // available = remaining − pending + editing.days = 5 + 1 = 6; 6 − 1 = 5 left after this.
    expect(
      screen.getByText(/5 vacation day\(s\) left after this/)
    ).toBeVisible()

    const resubmit = screen.getByTestId("leave-submit")
    expect(resubmit).toHaveTextContent("Save & resubmit")
    fireEvent.click(resubmit)
    expect(updateMutate).toHaveBeenCalledTimes(1)
    expect(updateMutate.mock.calls[0][0]).toMatchObject({ id: 42 })
    expect(createMutate).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("editing a RETURNED request with no review note hides the banner", () => {
    const editing = makeLeave({ status: "RETURNED", reviewNote: null })
    renderModal({ editing })
    expect(screen.queryByText(/^Returned:/)).not.toBeInTheDocument()
  })

  it("editing a DRAFT request uses the default description (not the revise copy)", () => {
    const editing = makeLeave({ status: "DRAFT" })
    renderModal({ editing })
    expect(
      screen.getByText(/Your request will be sent to HR for review/i)
    ).toBeInTheDocument()
    expect(screen.getByTestId("leave-submit")).toHaveTextContent(
      "Save & resubmit"
    )
  })
})

describe("LeaveModal — busy + error + lifecycle", () => {
  it("while pending the submit button reads 'Submitting…' and is disabled", () => {
    mutationState.pending = true
    renderModal()
    pick()
    const submit = screen.getByTestId("leave-submit")
    expect(submit).toHaveTextContent("Submitting…")
    expect(submit).toBeDisabled()
  })

  it("a backend error with a message is surfaced inline", () => {
    mutationState.isError = true
    mutationState.error = { response: { data: { message: "Server said no" } } }
    renderModal()
    pick()
    expect(screen.getByText("Server said no")).toBeInTheDocument()
  })

  it("a backend error without a message falls back to the default copy", () => {
    mutationState.isError = true
    mutationState.error = {}
    renderModal()
    pick()
    expect(
      screen.getByText(/Failed to file leave request\. Please try again/)
    ).toBeInTheDocument()
  })

  it("rendering closed shows no form fields (skips the seed effect)", () => {
    renderModal({ open: false })
    expect(screen.queryByTestId("leave-submit")).not.toBeInTheDocument()
  })

  it("pressing Escape triggers onClose", () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(onClose).toHaveBeenCalled()
  })
})
