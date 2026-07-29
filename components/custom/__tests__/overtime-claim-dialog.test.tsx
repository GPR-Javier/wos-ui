import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { OvertimeRequest } from "@/lib/overtime-api"

// ── Hoisted mutable state the mocked hooks read on every render ─────────────────
const { claimMutate, state, attendance } = vi.hoisted(() => ({
  claimMutate: vi.fn(),
  state: {
    pending: false,
    isError: false,
    error: undefined as unknown,
  },
  attendance: {
    current: undefined as
      | {
          content: Array<{
            date: string
            timeIn?: string | null
            timeOut?: string | null
          }>
        }
      | undefined,
  },
}))

vi.mock("@/hooks/use-overtime", () => ({
  useSubmitOvertimeClaim: () => ({
    mutate: claimMutate,
    isPending: state.pending,
    isError: state.isError,
    error: state.error,
  }),
}))
vi.mock("@/hooks/use-employee", () => ({
  useAttendance: () => ({ data: attendance.current }),
}))
vi.mock("@/hooks/use-time-format", () => ({
  useTimeFormat: () => ({
    formatTime: (v: string | null | undefined) => (v == null ? "" : String(v)),
  }),
}))

import { OvertimeClaimDialog } from "@/components/custom/overtime-claim-dialog"

function makeRequest(o: Partial<OvertimeRequest> = {}): OvertimeRequest {
  return {
    id: 42,
    userId: 1,
    userName: "Jane Cruz",
    userEmail: "jane@example.com",
    overtimeDate: "2026-07-10",
    plannedStartTime: "18:00",
    plannedEndTime: "20:00",
    plannedHours: 2,
    startTime: null,
    endTime: null,
    totalHours: null,
    overtimeType: "REGULAR",
    reason: "Sprint crunch",
    status: "AUTHORIZED",
    adminInitiated: false,
    authorizedBy: null,
    authorizedByName: null,
    authorizedAt: null,
    declineReason: null,
    reviewNote: null,
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    attachmentUrls: [],
    createdAt: "2026-07-01T08:00:00Z",
    updatedAt: "2026-07-01T08:00:00Z",
    ...o,
  }
}

function renderDialog(req: OvertimeRequest, onClose = vi.fn()) {
  render(<OvertimeClaimDialog request={req} onClose={onClose} />)
  return { onClose }
}

function timeInputs() {
  const inputs =
    document.querySelectorAll<HTMLInputElement>('input[type="time"]')
  return { start: inputs[0], end: inputs[1] }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.pending = false
  state.isError = false
  state.error = undefined
  attendance.current = undefined
})

describe("OvertimeClaimDialog — prefill + display", () => {
  it("prefills from the planned window when there is no attendance and shows the estimate + total", () => {
    renderDialog(makeRequest())
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("File Actual Hours")).toBeInTheDocument()
    // Authorized estimate line renders the planned window + planned hours.
    expect(within(dialog).getByText("Authorized estimate")).toBeInTheDocument()
    // Prefill 18:00→20:00 = 2h actual total.
    expect(within(dialog).getByText("Actual total")).toBeInTheDocument()
    expect(within(dialog).getByText("2h")).toBeInTheDocument()
    const { start, end } = timeInputs()
    expect(start.value).toBe("18:00")
    expect(end.value).toBe("20:00")
  })

  it("prefills from logged attendance (ISO date-time / 'T' branch) over the plan", () => {
    attendance.current = {
      content: [
        {
          date: "2026-07-10",
          timeIn: "2026-07-10T19:00:00",
          timeOut: "2026-07-10T21:30:00",
        },
      ],
    }
    renderDialog(makeRequest())
    const { start, end } = timeInputs()
    expect(start.value).toBe("19:00")
    expect(end.value).toBe("21:30")
  })

  it("parses a non-'T' but Date-parseable attendance value", () => {
    attendance.current = {
      content: [
        {
          date: "2026-07-10",
          timeIn: "Jul 10 2026 19:00:00",
          timeOut: "Jul 10 2026 22:00:00",
        },
      ],
    }
    renderDialog(makeRequest())
    const { start, end } = timeInputs()
    expect(start.value).toBe("19:00")
    expect(end.value).toBe("22:00")
  })

  it("falls back to the plan when the attendance value is unparseable", () => {
    attendance.current = {
      content: [{ date: "2026-07-10", timeIn: "garbage", timeOut: "nonsense" }],
    }
    renderDialog(makeRequest())
    // Unparseable → toHHmm returns "" → falls through to the planned window.
    const { start, end } = timeInputs()
    expect(start.value).toBe("18:00")
    expect(end.value).toBe("20:00")
  })

  it("shows an em dash and no planned-hours suffix when there is no authorized estimate", () => {
    renderDialog(
      makeRequest({
        plannedStartTime: null,
        plannedEndTime: null,
        plannedHours: null,
      })
    )
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("—")).toBeInTheDocument()
    const { start, end } = timeInputs()
    expect(start.value).toBe("")
    expect(end.value).toBe("")
    // No start/end → submit disabled.
    expect(
      within(dialog).getByRole("button", { name: "Submit Actual Hours" })
    ).toBeDisabled()
  })

  it("handles a planned start with a null planned end (?? '' guard)", () => {
    renderDialog(
      makeRequest({ plannedStartTime: "18:00", plannedEndTime: null })
    )
    expect(screen.getByText("Authorized estimate")).toBeInTheDocument()
  })

  it("shows the returned-for-revision note and the Resubmit label", () => {
    renderDialog(
      makeRequest({
        status: "RETURNED",
        reviewNote: "Please recheck the end time.",
      })
    )
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByText("Returned for revision")
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText("Please recheck the end time.")
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Resubmit Hours" })
    ).toBeInTheDocument()
  })
})

describe("OvertimeClaimDialog — validation", () => {
  it("flags an end that is not after the start", () => {
    renderDialog(makeRequest())
    const { end } = timeInputs()
    fireEvent.change(end, { target: { value: "18:00" } })
    expect(
      screen.getByText("End time must be after start time.")
    ).toBeInTheDocument()
  })

  it("flags a range shorter than the minimum overtime hour", () => {
    renderDialog(makeRequest())
    const { end } = timeInputs()
    fireEvent.change(end, { target: { value: "18:30" } })
    expect(
      screen.getByText(/Overtime must be at least 1 hour\./)
    ).toBeInTheDocument()
  })

  it("editing the start time recomputes the actual total", () => {
    renderDialog(makeRequest())
    const { start, end } = timeInputs()
    fireEvent.change(start, { target: { value: "19:00" } })
    fireEvent.change(end, { target: { value: "22:00" } })
    expect(screen.getByText("Actual total")).toBeInTheDocument()
    expect(screen.getByText("3h")).toBeInTheDocument()
  })
})

describe("OvertimeClaimDialog — submit + close", () => {
  it("submits the actual hours and closes on success", () => {
    claimMutate.mockImplementation(
      (_args: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    const { onClose } = renderDialog(makeRequest())
    const note = screen.getByPlaceholderText(
      /Anything different from the plan/i
    )
    fireEvent.change(note, { target: { value: "Ran over" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit Actual Hours" }))
    expect(claimMutate).toHaveBeenCalledWith(
      {
        id: 42,
        body: { startTime: "18:00", endTime: "20:00", reason: "Ran over" },
      },
      expect.anything()
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("Cancel closes without submitting", () => {
    const { onClose } = renderDialog(makeRequest())
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalled()
    expect(claimMutate).not.toHaveBeenCalled()
  })

  it("Escape drives onOpenChange → onClose", () => {
    const { onClose } = renderDialog(makeRequest())
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(onClose).toHaveBeenCalled()
  })

  it("disables both buttons and shows the busy label while pending", () => {
    state.pending = true
    renderDialog(makeRequest())
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Submitting…" })).toBeDisabled()
  })

  it("renders the API error message when the mutation errors", () => {
    state.isError = true
    state.error = {
      response: { data: { message: "Overlaps an existing claim." } },
    }
    renderDialog(makeRequest())
    expect(screen.getByText("Overlaps an existing claim.")).toBeInTheDocument()
  })

  it("falls back to a generic error message when none is provided", () => {
    state.isError = true
    state.error = {}
    renderDialog(makeRequest())
    expect(
      screen.getByText(/Failed to file actual hours\. Please try again\./)
    ).toBeInTheDocument()
  })
})
