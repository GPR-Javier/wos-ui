import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// ── Hoisted mutable state the mocked hooks read on every render ─────────────────
const { normalMutate, emergencyMutate, state, policy, attendance, holidays } =
  vi.hoisted(() => ({
    normalMutate: vi.fn(),
    emergencyMutate: vi.fn(),
    state: {
      normalPending: false,
      normalError: false,
      normalErrorObj: undefined as unknown,
      emergencyPending: false,
    },
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
    attendance: {
      current: undefined as
        | {
            content: Array<{
              date: string
              status?: string
              timeIn?: string | null
              timeOut?: string | null
              hoursWorked?: string
              otHours?: string
            }>
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
  useCreateOvertimeRequest: () => ({
    mutate: normalMutate,
    isPending: state.normalPending,
    isError: state.normalError,
    error: state.normalErrorObj,
  }),
  useCreateEmergencyOvertime: () => ({
    mutate: emergencyMutate,
    isPending: state.emergencyPending,
    isError: false,
    error: undefined,
  }),
}))
vi.mock("@/hooks/use-employee", () => ({
  useAttendance: () => ({ data: attendance.current }),
}))
vi.mock("@/hooks/use-schedule-policy", () => ({
  useMyPolicy: () => ({ data: policy.current }),
}))
vi.mock("@/hooks/use-time-format", () => ({
  useTimeFormat: () => ({
    formatTime: (v: string | null | undefined) => (v == null ? "" : String(v)),
  }),
}))
vi.mock("@/hooks/use-holidays", () => ({
  useHolidays: () => ({ data: holidays.current }),
}))

import {
  OvertimeRequestDialog,
  fmtHours,
} from "@/components/custom/overtime-request-dialog"

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

function renderDialog(
  props: Partial<{
    emergency: boolean
    defaultDate: string
    open: boolean
  }> = {}
) {
  const onClose = vi.fn()
  render(
    <OvertimeRequestDialog
      open={props.open ?? true}
      onClose={onClose}
      emergency={props.emergency}
      defaultDate={props.defaultDate}
    />
  )
  return { onClose }
}

function dateInput() {
  return document.querySelector<HTMLInputElement>('input[type="date"]')!
}
function timeInputs() {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="time"]')
  )
}
function reasonBox() {
  return screen.getByPlaceholderText(/Describe the work performed/i)
}

beforeEach(() => {
  vi.clearAllMocks()
  state.normalPending = false
  state.normalError = false
  state.normalErrorObj = undefined
  state.emergencyPending = false
  policy.current = {
    workdays: [...WORKDAYS_INCLUDING],
    earliestClockIn: "09:00",
    latestClockOut: "18:00",
    requiredHours: 9,
  }
  attendance.current = undefined
  holidays.current = []
})

describe("fmtHours helper", () => {
  it("renders an em dash for zero, whole hours, and hours+minutes", () => {
    expect(fmtHours(0)).toBe("—")
    expect(fmtHours(2)).toBe("2h")
    expect(fmtHours(2.5)).toBe("2h 30m")
  })
})

describe("OvertimeRequestDialog — regular day", () => {
  it("renders nothing while closed", () => {
    renderDialog({ open: false })
    expect(screen.queryByText("File Overtime Request")).not.toBeInTheDocument()
  })

  it("submits a regular-day overtime request and closes on success", () => {
    normalMutate.mockImplementation(
      (_a: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    const { onClose } = renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [start, end] = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "20:00" } })
    fireEvent.change(reasonBox(), { target: { value: "Sprint crunch" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }))
    expect(normalMutate).toHaveBeenCalledWith(
      {
        overtimeDate: FUTURE,
        startTime: "18:00",
        endTime: "20:00",
        overtimeType: "REGULAR",
        reason: "Sprint crunch",
        isDraft: false,
      },
      expect.anything()
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("Save as Draft submits with isDraft:true and no reason required", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [start, end] = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "20:00" } })
    fireEvent.click(screen.getByRole("button", { name: "Save as Draft" }))
    expect(normalMutate).toHaveBeenCalledWith(
      expect.objectContaining({ isDraft: true, overtimeType: "REGULAR" }),
      expect.anything()
    )
  })

  it("flags an end before start, a sub-minimum window, and an over-cap window", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [start, end] = timeInputs()

    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "18:00" } })
    expect(
      screen.getByText("End time must be after start time.")
    ).toBeInTheDocument()

    fireEvent.change(end, { target: { value: "18:30" } })
    expect(
      screen.getByText(/Overtime must be at least 1 hour to be filed\./)
    ).toBeInTheDocument()

    fireEvent.change(start, { target: { value: "08:00" } })
    fireEvent.change(end, { target: { value: "18:00" } })
    expect(
      screen.getByText(/Overtime can't exceed 8 hours; please contact HR\./)
    ).toBeInTheDocument()
  })

  it("shows the API error message, then the generic fallback", () => {
    state.normalError = true
    state.normalErrorObj = {
      response: { data: { message: "Overlapping request." } },
    }
    const { onClose } = renderDialog()
    expect(screen.getByText("Overlapping request.")).toBeInTheDocument()
    void onClose
  })

  it("falls back to a generic error message when none is provided", () => {
    state.normalError = true
    state.normalErrorObj = {}
    renderDialog()
    expect(
      screen.getByText(/Failed to file overtime request\. Please try again\./)
    ).toBeInTheDocument()
  })

  it("shows the busy label and disables Cancel while pending", () => {
    state.normalPending = true
    renderDialog()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Submitting…" })).toBeDisabled()
  })

  it("Cancel and Escape close the dialog", () => {
    const { onClose } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe("OvertimeRequestDialog — day guide + prefill", () => {
  it("prefills the OT range from logged attendance beyond the standard hours", () => {
    attendance.current = {
      content: [
        {
          date: FUTURE,
          status: "present",
          timeIn: `${FUTURE}T08:00:00`,
          timeOut: `${FUTURE}T19:00:00`,
          hoursWorked: "9h",
          otHours: "2h",
        },
      ],
    }
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    // Guide shows logged time + worked/OT.
    expect(screen.getByText("Logged time")).toBeInTheDocument()
    expect(screen.getByText("Worked / OT")).toBeInTheDocument()
    // Regular prefill: OT starts at in-time + required (08:00 + 9h = 17:00) → 19:00.
    const [start, end] = timeInputs()
    expect(start.value).toBe("17:00")
    expect(end.value).toBe("19:00")
  })

  it("parses a Date-parseable (non-'T') attendance value", () => {
    attendance.current = {
      content: [
        {
          date: FUTURE,
          timeIn: "Jan 1 2026 08:00:00",
          timeOut: "Jan 1 2026 19:00:00",
          hoursWorked: "9h",
          otHours: "—",
        },
      ],
    }
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [start, end] = timeInputs()
    expect(start.value).toBe("17:00")
    expect(end.value).toBe("19:00")
  })

  it("skips the prefill when the logged times are missing / unparseable", () => {
    attendance.current = {
      content: [
        {
          date: FUTURE,
          timeIn: "garbage",
          timeOut: null,
          hoursWorked: "—",
        },
      ],
    }
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [start, end] = timeInputs()
    expect(start.value).toBe("")
    expect(end.value).toBe("")
  })

  it("does not re-prefill when the same date is re-selected (ref guard)", () => {
    attendance.current = {
      content: [
        {
          date: FUTURE,
          timeIn: `${FUTURE}T08:00:00`,
          timeOut: `${FUTURE}T19:00:00`,
          hoursWorked: "9h",
          otHours: "—",
        },
      ],
    }
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    // Clear then re-pick the same date → the prefilledFor guard short-circuits.
    fireEvent.change(dateInput(), { target: { value: "" } })
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [start] = timeInputs()
    expect(start.value).toBe("17:00")
  })

  it("annotates an exact holiday and a recurring holiday", () => {
    holidays.current = [
      {
        date: FUTURE,
        name: "Independence Day",
        holidayType: "REGULAR",
        recurring: false,
        active: true,
      },
    ]
    const { onClose } = renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(screen.getByText("Independence Day")).toBeInTheDocument()
    void onClose

    holidays.current = [
      {
        date: `2000-${FUTURE.slice(5)}`,
        name: "Recurring Day",
        holidayType: "SPECIAL_NON_WORKING",
        recurring: true,
        active: true,
      },
    ]
    renderDialog()
    const dates =
      document.querySelectorAll<HTMLInputElement>('input[type="date"]')
    fireEvent.change(dates[dates.length - 1], { target: { value: FUTURE } })
    expect(screen.getByText("Recurring Day")).toBeInTheDocument()
  })
})

describe("OvertimeRequestDialog — rest day", () => {
  beforeEach(() => {
    policy.current = {
      workdays: [...WORKDAYS_EXCLUDING],
      earliestClockIn: "09:00",
      latestClockOut: "18:00",
      requiredHours: 9,
    }
  })

  it("shows the rest-day duty range and submits rest-day duty only", () => {
    normalMutate.mockImplementation(
      (_a: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    const { onClose } = renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(
      screen.getByText("Rest day — no scheduled shift")
    ).toBeInTheDocument()
    expect(screen.getByText(/Rest Day Duty Range/)).toBeInTheDocument()
    const [rdStart, rdEnd] = timeInputs()
    fireEvent.change(rdStart, { target: { value: "09:00" } })
    fireEvent.change(rdEnd, { target: { value: "17:00" } })
    fireEvent.change(reasonBox(), { target: { value: "Weekend duty" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }))
    expect(normalMutate).toHaveBeenCalledWith(
      {
        overtimeDate: FUTURE,
        restStartTime: "09:00",
        restEndTime: "17:00",
        startTime: null,
        endTime: null,
        overtimeType: "REST_DAY",
        reason: "Weekend duty",
        isDraft: false,
      },
      expect.anything()
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("flags a rest-day end before start and duty exceeding the standard hours", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [rdStart, rdEnd] = timeInputs()

    fireEvent.change(rdStart, { target: { value: "09:00" } })
    fireEvent.change(rdEnd, { target: { value: "09:00" } })
    expect(
      screen.getByText("Rest-day end time must be after the start time.")
    ).toBeInTheDocument()

    fireEvent.change(rdStart, { target: { value: "08:00" } })
    fireEvent.change(rdEnd, { target: { value: "18:00" } })
    expect(
      screen.getByText(/Rest-day duty can't exceed 9h/)
    ).toBeInTheDocument()
  })

  it("adds an overtime range on a rest day that already logged OT, and submits both", () => {
    attendance.current = {
      content: [
        {
          date: FUTURE,
          status: "restday",
          timeIn: `${FUTURE}T08:00:00`,
          timeOut: `${FUTURE}T19:00:00`,
          hoursWorked: "9h",
          otHours: "2h",
        },
      ],
    }
    normalMutate.mockImplementation(
      (_a: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    // Policy back to a normal workday to prove the record's `restday` status drives it.
    policy.current = {
      workdays: [...WORKDAYS_INCLUDING],
      earliestClockIn: "09:00",
      latestClockOut: "18:00",
      requiredHours: 9,
    }
    const { onClose } = renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    // Split prefill: rd 08:00–17:00, ot 17:00–19:00 (four time inputs).
    const inputs = timeInputs()
    expect(inputs).toHaveLength(4)
    expect(inputs[0].value).toBe("08:00")
    expect(inputs[1].value).toBe("17:00")
    expect(inputs[2].value).toBe("17:00")
    expect(inputs[3].value).toBe("19:00")
    fireEvent.change(reasonBox(), { target: { value: "Rest-day OT" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }))
    expect(normalMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        overtimeType: "REST_DAY",
        restStartTime: "08:00",
        restEndTime: "17:00",
        startTime: "17:00",
        endTime: "19:00",
      }),
      expect.anything()
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("prefills rest-day duty only when the rest day logged no OT", () => {
    attendance.current = {
      content: [
        {
          date: FUTURE,
          status: "restday",
          timeIn: `${FUTURE}T09:00:00`,
          timeOut: `${FUTURE}T15:00:00`,
          hoursWorked: "6h",
          otHours: "—",
        },
      ],
    }
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const inputs = timeInputs()
    // Only the duty range is shown (no OT range) → 2 inputs, filled 09:00–15:00.
    expect(inputs).toHaveLength(2)
    expect(inputs[0].value).toBe("09:00")
    expect(inputs[1].value).toBe("15:00")
  })
})

describe("OvertimeRequestDialog — emergency + attachments", () => {
  it("routes an emergency filing to the emergency endpoint with no draft option", () => {
    const { onClose } = renderDialog({ emergency: true })
    expect(screen.getByText("File Emergency Overtime")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Save as Draft" })
    ).not.toBeInTheDocument()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const [start, end] = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "20:00" } })
    fireEvent.change(reasonBox(), { target: { value: "System outage" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit Emergency OT" }))
    expect(emergencyMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        overtimeType: "REGULAR",
        reason: "System outage",
      }),
      expect.anything()
    )
    expect(normalMutate).not.toHaveBeenCalled()
    void onClose
  })

  it("prefills the overtime date from the defaultDate prop", () => {
    renderDialog({ defaultDate: FUTURE })
    expect(dateInput().value).toBe(FUTURE)
  })

  it("attaches and removes supporting documents", () => {
    renderDialog()
    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    // A change event with no files is a no-op (guards the `if (e.target.files)`).
    fireEvent.change(fileInput, { target: { files: null } })
    expect(screen.queryByText("proof.png")).not.toBeInTheDocument()

    const file = new File(["x"], "proof.png", { type: "image/png" })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(screen.getByText("proof.png")).toBeInTheDocument()
    // The remove button is the trailing icon-button next to the file row.
    const removeBtn = screen
      .getByText("proof.png")
      .closest("div")!
      .parentElement!.querySelector("button")!
    fireEvent.click(removeBtn)
    expect(screen.queryByText("proof.png")).not.toBeInTheDocument()
  })
})

describe("OvertimeRequestDialog — policy fallbacks + rest-day holiday", () => {
  it("defaults the required hours and hides the day guide when there is no policy or record", () => {
    policy.current = undefined
    attendance.current = undefined
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    // No policy and no record → the day guide is not rendered.
    expect(screen.queryByText("Scheduled shift")).not.toBeInTheDocument()
    expect(screen.queryByText("Logged time")).not.toBeInTheDocument()
    // Still fileable — the required-hours default (9) keeps the form working.
    const [start, end] = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "20:00" } })
    fireEvent.change(reasonBox(), { target: { value: "No-policy OT" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }))
    expect(normalMutate).toHaveBeenCalled()
  })

  it("renders the day guide from the attendance record alone when there is no policy", () => {
    policy.current = undefined
    attendance.current = {
      content: [
        {
          date: FUTURE,
          timeIn: `${FUTURE}T09:00:00`,
          timeOut: `${FUTURE}T18:00:00`,
          hoursWorked: "9h",
          otHours: "—",
        },
      ],
    }
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    expect(screen.getByText("Logged time")).toBeInTheDocument()
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
    // Holiday annotation renders while isRestDay is true (the rest-day suffix branch).
    expect(screen.getByText("Holiday On Rest Day")).toBeInTheDocument()
    expect(
      screen.getByText("Rest day — no scheduled shift")
    ).toBeInTheDocument()
  })
})
