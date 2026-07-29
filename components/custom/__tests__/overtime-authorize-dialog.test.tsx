import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

// ── Hoisted mutable state the mocked hooks read on every render ─────────────────
const { createMutate, state, policy, holidays } = vi.hoisted(() => ({
  createMutate: vi.fn(),
  state: { pending: false, isError: false, error: undefined as unknown },
  policy: {
    current: undefined as
      | {
          workdays: string[]
          earliestClockIn: string
          latestClockOut: string
          requiredHours: number
        }
      | undefined,
  },
  holidays: {
    current: [] as Array<{
      date: string
      name: string
      holidayType: "REGULAR" | "SPECIAL_NON_WORKING"
      recurring: boolean
      active: boolean
    }>,
  },
}))

vi.mock("@/hooks/use-overtime", () => ({
  useCreateOvertimeAuthorization: () => ({
    mutate: createMutate,
    isPending: state.pending,
    isError: state.isError,
    error: state.error,
  }),
}))
vi.mock("@/hooks/use-schedule-policy", () => ({
  useMyPolicy: () => ({ data: policy.current }),
}))
vi.mock("@/hooks/use-holidays", () => ({
  useHolidays: () => ({ data: holidays.current }),
}))
vi.mock("@/hooks/use-time-format", () => ({
  useTimeFormat: () => ({
    formatTime: (v: string | null | undefined) => (v == null ? "" : String(v)),
  }),
}))

import { OvertimeAuthorizeDialog } from "@/components/custom/overtime-authorize-dialog"

const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`
}

const FUTURE = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return iso(d)
})()
const FUTURE_CODE = WD[new Date(`${FUTURE}T00:00:00`).getDay()]
const WORKDAYS_INCLUDING = [FUTURE_CODE]
const WORKDAYS_EXCLUDING = WD.filter((c) => c !== FUTURE_CODE)
const PAST = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 10)
  return iso(d)
})()

function renderDialog(onClose = vi.fn(), open = true) {
  const { rerender } = render(
    <OvertimeAuthorizeDialog open={open} onClose={onClose} />
  )
  return { onClose, rerender }
}

function dateInput() {
  return document.querySelector<HTMLInputElement>('input[type="date"]')!
}
function timeInputs() {
  const inputs =
    document.querySelectorAll<HTMLInputElement>('input[type="time"]')
  return { start: inputs[0], end: inputs[1] }
}
function reasonBox() {
  return screen.getByPlaceholderText(/Why is this overtime needed/i)
}

/** Fill a valid future-dated authorization (date, window, reason). */
function fillValid() {
  fireEvent.change(dateInput(), { target: { value: FUTURE } })
  const { start, end } = timeInputs()
  fireEvent.change(start, { target: { value: "18:00" } })
  fireEvent.change(end, { target: { value: "20:00" } })
  fireEvent.change(reasonBox(), { target: { value: "Release night" } })
}

beforeEach(() => {
  vi.clearAllMocks()
  state.pending = false
  state.isError = false
  state.error = undefined
  policy.current = {
    workdays: [...WORKDAYS_INCLUDING],
    earliestClockIn: "09:00",
    latestClockOut: "18:00",
    requiredHours: 9,
  }
  holidays.current = []
})

describe("OvertimeAuthorizeDialog — render gating", () => {
  it("renders nothing while closed", () => {
    renderDialog(vi.fn(), false)
    expect(
      screen.queryByText("Request Overtime Authorization")
    ).not.toBeInTheDocument()
  })

  it("renders the form when open", () => {
    renderDialog()
    expect(
      screen.getByText("Request Overtime Authorization")
    ).toBeInTheDocument()
  })
})

describe("OvertimeAuthorizeDialog — day guide", () => {
  it("shows the scheduled shift on a workday with no holiday", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(screen.getByText("Scheduled shift")).toBeInTheDocument()
  })

  it("shows a rest-day guide when the weekday is outside the policy workdays", () => {
    policy.current = {
      workdays: [...WORKDAYS_EXCLUDING],
      earliestClockIn: "09:00",
      latestClockOut: "18:00",
      requiredHours: 9,
    }
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(
      screen.getByText("Rest day — no scheduled shift")
    ).toBeInTheDocument()
  })

  it("annotates an exactly-dated holiday", () => {
    holidays.current = [
      {
        date: FUTURE,
        name: "Founders Day",
        holidayType: "SPECIAL_NON_WORKING",
        recurring: false,
        active: true,
      },
    ]
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(screen.getByText("Founders Day")).toBeInTheDocument()
  })

  it("matches a recurring holiday by month/day when there is no exact match", () => {
    holidays.current = [
      {
        date: `2000-${FUTURE.slice(5)}`,
        name: "Recurring Fiesta",
        holidayType: "REGULAR",
        recurring: true,
        active: true,
      },
    ]
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(screen.getByText("Recurring Fiesta")).toBeInTheDocument()
  })

  it("adds the rest-day multiplier note when a holiday falls on a rest day", () => {
    policy.current = {
      workdays: [...WORKDAYS_EXCLUDING],
      earliestClockIn: "09:00",
      latestClockOut: "18:00",
      requiredHours: 9,
    }
    holidays.current = [
      {
        date: FUTURE,
        name: "Holiday On Rest Day",
        holidayType: "REGULAR",
        recurring: false,
        active: true,
      },
    ]
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(screen.getByText("Holiday On Rest Day")).toBeInTheDocument()
    expect(
      screen.getByText("Rest day — no scheduled shift")
    ).toBeInTheDocument()
  })

  it("ignores an inactive / non-matching holiday", () => {
    holidays.current = [
      {
        date: "2000-01-01",
        name: "Not Today",
        holidayType: "REGULAR",
        recurring: false,
        active: true,
      },
    ]
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(screen.queryByText("Not Today")).not.toBeInTheDocument()
  })
})

describe("OvertimeAuthorizeDialog — validation", () => {
  it("blocks a past date with an explanatory error and hides the day guide", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: PAST } })
    expect(
      screen.getByText(/Authorization is for upcoming work/i)
    ).toBeInTheDocument()
    expect(screen.queryByText("Scheduled shift")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Request Authorization" })
    ).toBeDisabled()
  })

  it("flags an end that is not after the start", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const { start, end } = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "18:00" } })
    expect(
      screen.getByText("End time must be after start time.")
    ).toBeInTheDocument()
  })

  it("flags a window shorter than the minimum planned hour", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const { start, end } = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "18:30" } })
    expect(
      screen.getByText(/Planned overtime must be at least 1 hour\./)
    ).toBeInTheDocument()
  })
})

describe("OvertimeAuthorizeDialog — submit + close", () => {
  it("submits a valid authorization and closes on success", () => {
    createMutate.mockImplementation(
      (_a: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    const { onClose } = renderDialog()
    fillValid()
    fireEvent.click(
      screen.getByRole("button", { name: "Request Authorization" })
    )
    expect(createMutate).toHaveBeenCalledWith(
      {
        overtimeDate: FUTURE,
        plannedStartTime: "18:00",
        plannedEndTime: "20:00",
        reason: "Release night",
        isDraft: false,
      },
      expect.anything()
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("Save as Draft submits with isDraft:true", () => {
    renderDialog()
    fillValid()
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }))
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ isDraft: true }),
      expect.anything()
    )
  })

  it("disables the actions and shows the busy label while pending", () => {
    state.pending = true
    renderDialog()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Submitting…" })).toBeDisabled()
  })

  it("Cancel closes the dialog", () => {
    const { onClose } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalled()
  })

  it("Escape drives onOpenChange → onClose", () => {
    const { onClose } = renderDialog()
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(onClose).toHaveBeenCalled()
  })

  it("renders the API error message when the mutation errors", () => {
    state.isError = true
    state.error = { response: { data: { message: "Already authorized." } } }
    renderDialog()
    expect(screen.getByText("Already authorized.")).toBeInTheDocument()
  })

  it("falls back to a generic error message when none is provided", () => {
    state.isError = true
    state.error = {}
    renderDialog()
    expect(
      screen.getByText(/Failed to file authorization\. Please try again\./)
    ).toBeInTheDocument()
  })

  it("keeps the day guide hidden until a date is picked", () => {
    renderDialog()
    // No date yet → dayLabel "" and no guide.
    expect(screen.queryByText("Scheduled shift")).not.toBeInTheDocument()
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()
  })
})
