import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { LeaveRequest } from "@/lib/leave-api"
import type { LeaveBalance } from "@/lib/employee-api"

// ── Mutable state + spies the mocked hooks read on every render ────────────────
const { cancelMutate, submitMutate, leaveState } = vi.hoisted(() => ({
  cancelMutate: vi.fn(),
  submitMutate: vi.fn(),
  leaveState: {
    paged: undefined as
      | { content: LeaveRequest[]; totalElements: number; totalPages: number }
      | undefined,
    loading: false,
    balances: [] as LeaveBalance[],
    cancelPending: false,
    submitPending: false,
  },
}))

vi.mock("@/hooks/use-leave", () => ({
  useMyLeaveRequests: () => ({
    data: leaveState.paged,
    isLoading: leaveState.loading,
  }),
  useCancelLeaveRequest: () => ({
    mutate: cancelMutate,
    isPending: leaveState.cancelPending,
  }),
  useSubmitLeaveDraft: () => ({
    mutate: submitMutate,
    isPending: leaveState.submitPending,
  }),
}))
vi.mock("@/hooks/use-employee", () => ({
  useLeaveBalances: () => ({ data: leaveState.balances }),
}))

// Stub the shared filing modal (covered by its own spec) — expose open/editing.
vi.mock("@/components/custom/leave-modal", () => {
  return {
    LeaveModal: ({
      open,
      onClose,
      editing,
    }: {
      open: boolean
      onClose: () => void
      editing?: LeaveRequest | null
    }) =>
      open ? (
        <div data-testid="leave-modal">
          <span>{editing ? `editing-${editing.id}` : "creating"}</span>
          <button data-testid="leave-modal-close" onClick={onClose}>
            close
          </button>
        </div>
      ) : null,
  }
})

// Trivial date-range trigger; keep the real useDateRange / thisYearRange.
vi.mock("@/components/custom/date-range-filter", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/components/custom/date-range-filter")
    >()
  const R = await import("react")
  return {
    ...actual,
    DateRangeFilter: ({
      onChange,
    }: {
      onChange: (v: { from: string; until: string }) => void
    }) =>
      R.createElement(
        "button",
        {
          "data-testid": "date-range-trigger",
          onClick: () => onChange({ from: "2026-03-01", until: "2026-03-31" }),
        },
        "range"
      ),
  }
})

import { MyLeavesSection } from "@/components/dashboard/employee/my-leaves"

const YEAR = new Date().getFullYear()

function makeRow(o: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 0,
    requestCode: "LV-0",
    userId: 1,
    employeeName: "Jane Cruz",
    employeeId: "E-1",
    employeeEmail: "jane@example.com",
    leaveType: "VACATION",
    startDate: `${YEAR}-06-10`,
    endDate: `${YEAR}-06-10`,
    days: 1,
    dayParts: {},
    status: "PENDING",
    reason: "Trip",
    filedAt: `${YEAR}-06-01T00:00:00Z`,
    reviewNote: null,
    reviewedByName: null,
    reviewedAt: null,
    ...o,
  }
}

// PENDING single-day, has reason → Cancel action, single-date display.
const rPending = makeRow({ id: 1, status: "PENDING" })
// APPROVED this year, multi-day + half-day override → counts.approved + ½ marker + range display.
const rApproved = makeRow({
  id: 2,
  status: "APPROVED",
  startDate: `${YEAR}-06-10`,
  endDate: `${YEAR}-06-12`,
  days: 2.5,
  dayParts: { [`${YEAR}-06-11`]: "HALF_AM" },
  reason: "Vacation",
})
// APPROVED but a prior year → NOT counted in "approved this year".
const rApprovedOld = makeRow({
  id: 3,
  status: "APPROVED",
  startDate: "2020-01-01",
  endDate: "2020-01-01",
})
// RETURNED with a review note → amber note + Revise + Cancel.
const rReturned = makeRow({
  id: 4,
  status: "RETURNED",
  reviewNote: "Please pick fewer days",
  reason: null, // → "—" in the reason cell
})
// RETURNED without a review note → no amber note.
const rReturnedNoNote = makeRow({ id: 5, status: "RETURNED", reviewNote: null })
// DRAFT with null dayParts → exercises the `?? {}` fallback; Edit + Submit + Cancel.
const rDraft = makeRow({
  id: 6,
  status: "DRAFT",
  dayParts: null as unknown as Record<string, never>,
  reason: null,
})
// REJECTED → counts.rejected, no row actions.
const rRejected = makeRow({ id: 7, status: "REJECTED" })

const ALL_ROWS = [
  rPending,
  rApproved,
  rApprovedOld,
  rReturned,
  rReturnedNoNote,
  rDraft,
  rRejected,
]

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MyLeavesSection />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  leaveState.paged = {
    content: ALL_ROWS,
    totalElements: ALL_ROWS.length,
    totalPages: 1,
  }
  leaveState.loading = false
  leaveState.balances = []
  leaveState.cancelPending = false
  leaveState.submitPending = false
})

describe("MyLeavesSection — table + stats", () => {
  it("renders a row per request, a ½ marker for half-days and single vs range dates", () => {
    renderSection()
    expect(screen.getAllByTestId("leave-row")).toHaveLength(7)
    // The approved row carries a half-day override → ½ marker rendered.
    expect(screen.getByText("½")).toBeInTheDocument()
    // A no-reason row falls back to an em dash.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    // Returned row shows its review note in amber.
    expect(screen.getByText("Please pick fewer days")).toBeInTheDocument()
  })

  it("renders the leave-balance breakdown card when balances exist", () => {
    leaveState.balances = [
      { type: "VACATION", total: 10, used: 4, pending: 2, remaining: 6 },
      { type: "SICK", total: 0, used: 0, pending: 0, remaining: 0 },
    ]
    renderSection()
    // "4 used · 2 pending" for the vacation pool.
    expect(screen.getByText(/4 used · 2 pending/)).toBeInTheDocument()
    // The zero-total pool renders "0 used" with no pending suffix.
    expect(screen.getByText(/^0 used$/)).toBeInTheDocument()
  })

  it("empty state offers a 'File a request' shortcut that opens the create modal", () => {
    leaveState.paged = { content: [], totalElements: 0, totalPages: 0 }
    renderSection()
    expect(screen.getByText(/No leave requests found/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /File a request/i }))
    expect(screen.getByTestId("leave-modal")).toHaveTextContent("creating")
  })

  it("loading state renders skeletons and no data rows", () => {
    leaveState.paged = undefined
    leaveState.loading = true
    renderSection()
    expect(screen.queryAllByTestId("leave-row")).toHaveLength(0)
  })
})

describe("MyLeavesSection — toolbar interactions", () => {
  it("File Leave opens the create modal", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("leave-new-request"))
    expect(screen.getByTestId("leave-modal")).toHaveTextContent("creating")
  })

  it("closing the modal returns to the list", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("leave-new-request"))
    fireEvent.click(screen.getByTestId("leave-modal-close"))
    expect(screen.queryByTestId("leave-modal")).not.toBeInTheDocument()
  })

  it("a status filter marks the tab active and narrows the rows", () => {
    renderSection()
    const approvedTab = screen.getByRole("button", { name: "Approved" })
    fireEvent.click(approvedTab)
    expect(approvedTab).toHaveClass("bg-background")
    // Two APPROVED rows (this year + prior year).
    expect(screen.getAllByTestId("leave-row")).toHaveLength(2)
  })

  it("changing the date range keeps the table rendered", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("date-range-trigger"))
    expect(screen.getAllByTestId("leave-row")).toHaveLength(7)
  })
})

describe("MyLeavesSection — row actions", () => {
  it("PENDING row can be cancelled", () => {
    renderSection()
    const row = screen.getAllByTestId("leave-row")[0]
    fireEvent.click(within(row).getByRole("button", { name: "Cancel" }))
    expect(cancelMutate).toHaveBeenCalledWith(1)
  })

  it("DRAFT row exposes Edit (opens the edit modal) and Submit (dispatches submit)", () => {
    renderSection()
    // rDraft is the 6th row (index 5).
    const row = screen.getAllByTestId("leave-row")[5]
    fireEvent.click(within(row).getByRole("button", { name: "Submit" }))
    expect(submitMutate).toHaveBeenCalledWith(6)

    fireEvent.click(within(row).getByRole("button", { name: "Edit" }))
    expect(screen.getByTestId("leave-modal")).toHaveTextContent("editing-6")
  })

  it("RETURNED row exposes Revise which opens the edit modal", () => {
    renderSection()
    const row = screen.getAllByTestId("leave-row")[3]
    fireEvent.click(within(row).getByRole("button", { name: "Revise" }))
    expect(screen.getByTestId("leave-modal")).toHaveTextContent("editing-4")
  })

  it("APPROVED and REJECTED rows expose no Cancel/Edit controls", () => {
    renderSection()
    const approvedRow = screen.getAllByTestId("leave-row")[1]
    const rejectedRow = screen.getAllByTestId("leave-row")[6]
    expect(
      within(approvedRow).queryByRole("button", { name: "Cancel" })
    ).not.toBeInTheDocument()
    expect(
      within(rejectedRow).queryByRole("button", { name: "Cancel" })
    ).not.toBeInTheDocument()
  })

  it("Cancel and Submit are disabled while their mutations are pending", () => {
    leaveState.cancelPending = true
    leaveState.submitPending = true
    renderSection()
    const pendingRow = screen.getAllByTestId("leave-row")[0]
    expect(
      within(pendingRow).getByRole("button", { name: "Cancel" })
    ).toBeDisabled()
    const draftRow = screen.getAllByTestId("leave-row")[5]
    expect(
      within(draftRow).getByRole("button", { name: "Submit" })
    ).toBeDisabled()
  })
})
