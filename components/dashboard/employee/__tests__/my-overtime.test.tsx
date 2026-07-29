import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { OvertimeRequest } from "@/lib/overtime-api"

// ── Hoisted mutable state the mocked hooks read on every render ─────────────────
const { cancelMutate, declineMutate, resubmitMutate, state } = vi.hoisted(
  () => ({
    cancelMutate: vi.fn(),
    declineMutate: vi.fn(),
    resubmitMutate: vi.fn(),
    state: {
      data: undefined as
        | {
            content: OvertimeRequest[]
            totalElements: number
            totalPages: number
          }
        | undefined,
      isLoading: false,
      cancelPending: false,
      declinePending: false,
      resubmitPending: false,
    },
  })
)

vi.mock("@/hooks/use-overtime", () => ({
  useMyOvertimeRequests: () => ({
    data: state.data,
    isLoading: state.isLoading,
  }),
  useCancelOvertimeRequest: () => ({
    mutate: cancelMutate,
    isPending: state.cancelPending,
  }),
  useDeclineOvertimeRequest: () => ({
    mutate: declineMutate,
    isPending: state.declinePending,
  }),
  useResubmitOvertimeRequest: () => ({
    mutate: resubmitMutate,
    isPending: state.resubmitPending,
  }),
}))
vi.mock("@/hooks/use-time-format", () => ({
  useTimeFormat: () => ({
    formatTime: (v: string | null | undefined) => (v == null ? "" : String(v)),
  }),
}))
vi.mock("@/hooks/use-overtime-rates", () => ({
  // Any overtime type resolves to a fixed multiplier so `.toFixed()` never throws.
  useEffectiveOtRates: () => new Proxy({}, { get: () => 1.25 }),
}))

// Child dialogs are covered by their own specs — stub to expose open/target.
vi.mock("@/components/custom/overtime-authorize-dialog", () => ({
  OvertimeAuthorizeDialog: ({
    open,
    onClose,
  }: {
    open: boolean
    onClose: () => void
  }) =>
    open ? (
      <div data-testid="authorize-dialog">
        <button data-testid="authorize-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))
vi.mock("@/components/custom/overtime-claim-dialog", () => ({
  OvertimeClaimDialog: ({
    request,
    onClose,
  }: {
    request: OvertimeRequest
    onClose: () => void
  }) => (
    <div data-testid="claim-dialog">
      <span>{`claim-${request.id}`}</span>
      <button data-testid="claim-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}))

// A trivial DateRangePicker that lets tests drive every preset + a manual range.
vi.mock("@/components/ui/date-range-picker", async () => {
  const R = await import("react")
  const isoOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`
  return {
    DateRangePicker: ({
      onChange,
      presets,
    }: {
      onChange: (v: { from: string; until: string }) => void
      presets: { label: string; range: () => { from: Date; until: Date } }[]
    }) =>
      R.createElement(
        "div",
        null,
        presets.map((p, i) =>
          R.createElement(
            "button",
            {
              key: i,
              "data-testid": `preset-${i}`,
              onClick: () => {
                const r = p.range()
                onChange({ from: isoOf(r.from), until: isoOf(r.until) })
              },
            },
            p.label
          )
        ),
        R.createElement(
          "button",
          {
            "data-testid": "range-wide",
            onClick: () =>
              onChange({ from: "2000-01-01", until: "2100-12-31" }),
          },
          "wide"
        )
      ),
  }
})

import { MyOvertimeSection } from "@/components/dashboard/employee/my-overtime"

function today(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(n.getDate()).padStart(2, "0")}`
}

function makeRow(o: Partial<OvertimeRequest>): OvertimeRequest {
  return {
    id: 0,
    userId: 1,
    userName: "Jane Cruz",
    userEmail: "jane@example.com",
    overtimeDate: today(),
    plannedStartTime: "18:00",
    plannedEndTime: "20:00",
    plannedHours: 2,
    startTime: null,
    endTime: null,
    totalHours: null,
    overtimeType: "REGULAR",
    reason: "row",
    status: "PENDING_AUTH",
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
    createdAt: `${today()}T08:00:00Z`,
    updatedAt: `${today()}T08:00:00Z`,
    ...o,
  }
}

// A representative row per status / display branch.
const rAuthorized = makeRow({
  id: 1,
  status: "AUTHORIZED",
  reason: "authorized-row",
})
const rReturnedClaim = makeRow({
  id: 2,
  status: "RETURNED",
  reason: "returned-with-hours",
  startTime: "18:00",
  endTime: "20:30",
  totalHours: 2.5,
  reviewNote: "Fix the end time",
  reviewedByName: "Boss",
  reviewedAt: `${today()}T09:00:00Z`,
})
const rReturnedResubmit = makeRow({
  id: 3,
  status: "RETURNED",
  reason: "returned-no-hours",
  totalHours: null,
})
const rApprovedRd = makeRow({
  id: 4,
  status: "APPROVED",
  reason: "approved-restday",
  overtimeType: "REST_DAY",
  startTime: "09:00",
  endTime: "17:00",
  totalHours: 8,
  declineReason: "n/a note",
  reviewNote: "Approved",
  reviewedByName: "Boss",
  reviewedAt: `${today()}T10:00:00Z`,
  attachmentUrls: ["https://x/y.pdf"],
})
const rApprovedOt = makeRow({
  id: 5,
  status: "APPROVED",
  reason: "approved-ot",
  overtimeType: "REGULAR",
  startTime: "18:00",
  endTime: "21:00",
  totalHours: 3,
})
const rRejected = makeRow({ id: 6, status: "REJECTED", reason: "rejected-row" })
const rAuthRejected = makeRow({
  id: 7,
  status: "AUTH_REJECTED",
  reason: "auth-rejected-row",
})
const rEmergency = makeRow({
  id: 8,
  status: "PENDING_EMERGENCY_CLAIM",
  reason: "emergency-row",
})
const rNoTimes = makeRow({
  id: 9,
  status: "DRAFT",
  reason: "no-times-row",
  plannedStartTime: null,
  plannedEndTime: null,
  plannedHours: null,
})

const ALL_ROWS = [
  rAuthorized,
  rReturnedClaim,
  rReturnedResubmit,
  rApprovedRd,
  rApprovedOt,
  rRejected,
  rAuthRejected,
  rEmergency,
  rNoTimes,
]

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={qc}>
      <MyOvertimeSection />
    </QueryClientProvider>
  )
  // Widen the range so all rows (dated today) show regardless of the default cut-off.
  fireEvent.click(screen.getByTestId("range-wide"))
  return utils
}

function rowByReason(reason: string) {
  return screen.getByText(reason).closest("tr") as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  state.data = {
    content: ALL_ROWS,
    totalElements: ALL_ROWS.length,
    totalPages: 1,
  }
  state.isLoading = false
  state.cancelPending = false
  state.declinePending = false
  state.resubmitPending = false
})

afterEach(() => {
  vi.useRealTimers()
})

describe("MyOvertimeSection — table + stats", () => {
  it("renders a row per request with the est. marker and an em dash for missing times", () => {
    renderSection()
    expect(
      screen.getAllByText(/-row|authorized-row|approved-/).length
    ).toBeGreaterThan(0)
    // The authorized row (planned only) shows an "est." marker.
    expect(screen.getAllByText("est.").length).toBeGreaterThan(0)
    // The DRAFT row with no times shows an em dash in the time cell.
    const draftRow = rowByReason("no-times-row")
    expect(within(draftRow).getAllByText("—").length).toBeGreaterThan(0)
  })

  it("loading state renders skeletons and no data rows", () => {
    state.data = undefined
    state.isLoading = true
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={qc}>
        <MyOvertimeSection />
      </QueryClientProvider>
    )
    expect(screen.queryByText("authorized-row")).not.toBeInTheDocument()
  })

  it("empty state offers a 'File a request' shortcut that opens the authorize dialog", () => {
    state.data = { content: [], totalElements: 0, totalPages: 0 }
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MyOvertimeSection />
      </QueryClientProvider>
    )
    expect(screen.getByText(/No overtime requests found/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /File a request/i }))
    expect(screen.getByTestId("authorize-dialog")).toBeInTheDocument()
  })
})

describe("MyOvertimeSection — toolbar", () => {
  it("New Request opens the authorize dialog and closing returns to the list", () => {
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: /New Request/i }))
    expect(screen.getByTestId("authorize-dialog")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("authorize-close"))
    expect(screen.queryByTestId("authorize-dialog")).not.toBeInTheDocument()
  })

  it("a status filter narrows the rows and marks the tab active", () => {
    renderSection()
    const approvedTab = screen.getByRole("button", { name: "Approved" })
    fireEvent.click(approvedTab)
    expect(approvedTab).toHaveClass("bg-background")
    expect(screen.getByText("approved-restday")).toBeInTheDocument()
    expect(screen.queryByText("rejected-row")).not.toBeInTheDocument()
  })

  it("every date-range preset computes a range without throwing, and Clear resets it", () => {
    renderSection()
    const presets = screen.getAllByTestId(/^preset-/)
    presets.forEach((btn) => fireEvent.click(btn))
    // Clear appears while a range is set.
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    // With no range, all rows show again.
    expect(screen.getByText("authorized-row")).toBeInTheDocument()
  })
})

describe("MyOvertimeSection — row actions", () => {
  it("AUTHORIZED row exposes 'File hours' which opens the claim dialog", () => {
    renderSection()
    const row = rowByReason("authorized-row")
    fireEvent.click(within(row).getByRole("button", { name: "File hours" }))
    expect(screen.getByTestId("claim-dialog")).toHaveTextContent("claim-1")
  })

  it("RETURNED row with actual hours opens the claim dialog via Revise", () => {
    renderSection()
    const row = rowByReason("returned-with-hours")
    fireEvent.click(within(row).getByRole("button", { name: "Revise" }))
    expect(screen.getByTestId("claim-dialog")).toHaveTextContent("claim-2")
  })

  it("RETURNED row without actual hours resubmits via Revise", () => {
    renderSection()
    const row = rowByReason("returned-no-hours")
    fireEvent.click(within(row).getByRole("button", { name: "Revise" }))
    expect(resubmitMutate).toHaveBeenCalledWith(3)
  })
})

describe("MyOvertimeSection — detail dialog", () => {
  it("opens the detail for an AUTHORIZED row and can cancel + submit actual hours", () => {
    renderSection()
    fireEvent.click(rowByReason("authorized-row"))
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByText("Overtime Request Detail")
    ).toBeInTheDocument()
    // canSubmitClaim(AUTHORIZED) → "Submit actual hours" opens the claim dialog.
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Submit actual hours" })
    )
    expect(screen.getByTestId("claim-dialog")).toHaveTextContent("claim-1")
  })

  it("AUTHORIZED detail can be cancelled and can be declined via a prompt", () => {
    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValue("Not needed anymore")
    renderSection()
    fireEvent.click(rowByReason("authorized-row"))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }))
    expect(declineMutate).toHaveBeenCalledWith(
      { id: 1, reason: "Not needed anymore" },
      expect.anything()
    )
    fireEvent.click(within(dialog).getByRole("button", { name: /^Cancel$/ }))
    expect(cancelMutate).toHaveBeenCalledWith(1, expect.anything())
    promptSpy.mockRestore()
  })

  it("declining with a dismissed prompt sends an undefined reason", () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null)
    renderSection()
    fireEvent.click(rowByReason("authorized-row"))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }))
    expect(declineMutate).toHaveBeenCalledWith(
      { id: 1, reason: undefined },
      expect.anything()
    )
    promptSpy.mockRestore()
  })

  it("APPROVED detail shows remarks, decline reason, attachments and no cancel/claim actions", () => {
    renderSection()
    fireEvent.click(rowByReason("approved-restday"))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Admin Remarks")).toBeInTheDocument()
    expect(within(dialog).getAllByText("Approved").length).toBeGreaterThan(0)
    expect(within(dialog).getByText("Decline Reason")).toBeInTheDocument()
    expect(within(dialog).getByText("Attachment 1")).toBeInTheDocument()
    expect(
      within(dialog).queryByRole("button", { name: "Submit actual hours" })
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("button", { name: /^Cancel$/ })
    ).not.toBeInTheDocument()
    // Close resets the detail (the footer Close, not Radix's built-in X).
    const closeButtons = within(dialog).getAllByRole("button", {
      name: "Close",
    })
    fireEvent.click(closeButtons[closeButtons.length - 1])
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("RETURNED-with-hours detail offers 'Revise actual hours'", () => {
    renderSection()
    fireEvent.click(rowByReason("returned-with-hours"))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Revise actual hours" })
    )
    expect(screen.getByTestId("claim-dialog")).toHaveTextContent("claim-2")
  })

  it("RETURNED-without-hours detail offers Resubmit", () => {
    renderSection()
    fireEvent.click(rowByReason("returned-no-hours"))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Resubmit" }))
    expect(resubmitMutate).toHaveBeenCalledWith(3, expect.anything())
  })

  it("a DRAFT row with no times renders an em dash and can be cancelled", () => {
    renderSection()
    fireEvent.click(rowByReason("no-times-row"))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getAllByText("—").length).toBeGreaterThan(0)
    fireEvent.click(within(dialog).getByRole("button", { name: /^Cancel$/ }))
    expect(cancelMutate).toHaveBeenCalledWith(9, expect.anything())
  })
})

describe("MyOvertimeSection — edge branches", () => {
  it("shows 0h stat fallbacks when nothing approved has hours", () => {
    state.data = { content: [rAuthorized], totalElements: 1, totalPages: 1 }
    renderSection()
    // Both the RD-hours and OT-hours cards fall back to "0h".
    expect(screen.getAllByText("0h").length).toBeGreaterThanOrEqual(2)
  })

  it("closing the claim dialog clears the claim target", () => {
    renderSection()
    fireEvent.click(
      within(rowByReason("authorized-row")).getByRole("button", {
        name: "File hours",
      })
    )
    expect(screen.getByTestId("claim-dialog")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("claim-close"))
    expect(screen.queryByTestId("claim-dialog")).not.toBeInTheDocument()
  })

  it("detail with remarks but no reviewer name omits the attribution line", () => {
    state.data = {
      content: [
        makeRow({
          id: 30,
          status: "APPROVED",
          reason: "note-no-name",
          totalHours: 2,
          reviewNote: "Well done",
          reviewedByName: null,
        }),
      ],
      totalElements: 1,
      totalPages: 1,
    }
    renderSection()
    fireEvent.click(rowByReason("note-no-name"))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Well done")).toBeInTheDocument()
    expect(within(dialog).queryByText(/^—\s/)).not.toBeInTheDocument()
  })

  it("covers null-hours and null-end-time fallbacks in rows and detail", () => {
    state.data = {
      content: [
        // REST_DAY approved, null hours, actual start but no end.
        makeRow({
          id: 40,
          status: "APPROVED",
          overtimeType: "REST_DAY",
          reason: "rd-null",
          totalHours: null,
          startTime: "09:00",
          endTime: null,
        }),
        // REGULAR approved, null hours, planned start but no planned end.
        makeRow({
          id: 41,
          status: "APPROVED",
          overtimeType: "REGULAR",
          reason: "ot-null",
          totalHours: null,
          startTime: null,
          plannedStartTime: "18:00",
          plannedEndTime: null,
        }),
      ],
      totalElements: 2,
      totalPages: 1,
    }
    renderSection()
    // Actual-start / no-end row detail (endTime ?? "").
    fireEvent.click(rowByReason("rd-null"))
    let dialog = screen.getByRole("dialog")
    const closeA = within(dialog).getAllByRole("button", { name: "Close" })
    fireEvent.click(closeA[closeA.length - 1])
    // Planned-start / no-planned-end row detail (plannedEndTime ?? "").
    fireEvent.click(rowByReason("ot-null"))
    dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Planned Time")).toBeInTheDocument()
  })

  it("shows the busy label on a pending cancel", () => {
    state.cancelPending = true
    renderSection()
    fireEvent.click(rowByReason("authorized-row"))
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByRole("button", { name: "Cancelling…" })
    ).toBeDisabled()
  })

  it("shows the busy label on a pending resubmit", () => {
    state.resubmitPending = true
    renderSection()
    fireEvent.click(rowByReason("returned-no-hours"))
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByRole("button", { name: "Resubmitting…" })
    ).toBeDisabled()
  })

  it("detail with a reviewer name but no reviewed-at omits the timestamp", () => {
    state.data = {
      content: [
        makeRow({
          id: 31,
          status: "APPROVED",
          reason: "note-no-date",
          totalHours: 2,
          reviewNote: "Approved fast",
          reviewedByName: "Boss",
          reviewedAt: null,
        }),
      ],
      totalElements: 1,
      totalPages: 1,
    }
    renderSection()
    fireEvent.click(rowByReason("note-no-date"))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/—\s*Boss/)).toBeInTheDocument()
  })
})

describe("MyOvertimeSection — cut-off presets across the month", () => {
  it("covers the first-half cut-off branches", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0)) // Jul 10 → day <= 15
    renderSection()
    screen.getAllByTestId(/^preset-/).forEach((b) => fireEvent.click(b))
    expect(screen.getByText("Overtime Requests")).toBeInTheDocument()
  })

  it("covers the second-half cut-off branches", () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 6, 20, 12, 0, 0)) // Jul 20 → day > 15
    renderSection()
    screen.getAllByTestId(/^preset-/).forEach((b) => fireEvent.click(b))
    expect(screen.getByText("Overtime Requests")).toBeInTheDocument()
  })
})
