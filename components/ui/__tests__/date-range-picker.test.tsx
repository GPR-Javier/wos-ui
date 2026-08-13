import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DateRangePicker } from "../date-range-picker"

/**
 * Periods already covered by a payroll run must be unselectable. Paying the same period twice is
 * not recoverable once released, so the picker is the last cheap place to stop it.
 */

// The picker opens on the current month, so the assertions below would only find August's cells
// during August. Pin the clock instead of letting these rot into a next-month failure.
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 7, 13))
})
afterAll(() => {
  vi.useRealTimers()
})

const COVERED = [
  {
    from: "2026-08-16",
    until: "2026-08-31",
    label: "Covered by the August 2026 run",
  },
]

function open() {
  return userEvent.click(
    screen.getByRole("button", { name: /start date|period start/i })
  )
}

function day(iso: string) {
  return screen.getByTestId(`drp-day-${iso}`)
}

describe("DateRangePicker — disabled ranges", () => {
  it("disables every day inside a covered period, inclusive of both ends", async () => {
    render(<DateRangePicker onChange={vi.fn()} disabledRanges={COVERED} />)
    await open()

    expect(day("2026-08-16")).toBeDisabled() // first day
    expect(day("2026-08-24")).toBeDisabled() // middle
    expect(day("2026-08-31")).toBeDisabled() // last day
  })

  it("leaves days outside the covered period selectable", async () => {
    render(<DateRangePicker onChange={vi.fn()} disabledRanges={COVERED} />)
    await open()

    expect(day("2026-08-15")).not.toBeDisabled()
    expect(day("2026-09-01")).not.toBeDisabled()
  })

  it("explains why a day is blocked", async () => {
    // A greyed-out day with no reason reads as a broken calendar.
    render(<DateRangePicker onChange={vi.fn()} disabledRanges={COVERED} />)
    await open()

    expect(day("2026-08-20")).toHaveAttribute(
      "title",
      "Covered by the August 2026 run"
    )
  })

  it("refuses a range that straddles a covered period", async () => {
    // Both endpoints are selectable on their own; the span between them is not.
    const onChange = vi.fn()
    render(<DateRangePicker onChange={onChange} disabledRanges={COVERED} />)
    await open()

    await userEvent.click(day("2026-08-10"))
    await userEvent.click(day("2026-09-05"))

    expect(onChange).not.toHaveBeenCalled()
  })

  it("still commits a range that clears the covered period", async () => {
    const onChange = vi.fn()
    render(<DateRangePicker onChange={onChange} disabledRanges={COVERED} />)
    await open()

    await userEvent.click(day("2026-08-01"))
    await userEvent.click(day("2026-08-15"))

    expect(onChange).toHaveBeenCalledWith({
      from: "2026-08-01",
      until: "2026-08-15",
    })
  })

  it("behaves as before when no ranges are given", async () => {
    const onChange = vi.fn()
    render(<DateRangePicker onChange={onChange} />)
    await open()

    await userEvent.click(day("2026-08-10"))
    await userEvent.click(day("2026-08-20"))

    expect(onChange).toHaveBeenCalledWith({
      from: "2026-08-10",
      until: "2026-08-20",
    })
  })
})
