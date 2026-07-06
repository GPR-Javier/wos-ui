import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { LeaveRequest } from "@/lib/leave-api"

// ── Mutable state + spies the mocked hooks read on every render ────────────────
const { approveMutate, rejectMutate, returnMutate, leaveState } = vi.hoisted(
  () => ({
    approveMutate: vi.fn(),
    rejectMutate: vi.fn(),
    returnMutate: vi.fn(),
    leaveState: {
      data: undefined as
        | { content: LeaveRequest[]; totalElements: number; totalPages: number }
        | undefined,
      isLoading: false,
      isError: false,
      approvePending: false,
      rejectPending: false,
      returnPending: false,
    },
  })
)

vi.mock("@/hooks/use-leave", () => ({
  useAllLeaveRequests: () => ({
    data: leaveState.data,
    isLoading: leaveState.isLoading,
    isError: leaveState.isError,
  }),
  useApproveLeaveRequest: () => ({
    mutate: approveMutate,
    isPending: leaveState.approvePending,
  }),
  useRejectLeaveRequest: () => ({
    mutate: rejectMutate,
    isPending: leaveState.rejectPending,
  }),
  useReturnLeaveRequest: () => ({
    mutate: returnMutate,
    isPending: leaveState.returnPending,
  }),
}))

// Trivial date-range trigger; keep the real useDateRange.
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
          onClick: () => onChange({ from: "2026-02-01", until: "2026-02-28" }),
        },
        "range"
      ),
  }
})

// Stub pagination — expose both callbacks so the parent's setPage/setPageSize run.
vi.mock("@/components/custom/table-pagination", async () => {
  const R = await import("react")
  return {
    TablePagination: ({
      page,
      setPage,
      setPageSize,
    }: {
      page: number
      setPage: (p: number) => void
      setPageSize: (s: number) => void
    }) =>
      R.createElement(
        "div",
        { "data-testid": "pagination" },
        R.createElement(
          "button",
          { "data-testid": "page-next", onClick: () => setPage(page + 1) },
          "next"
        ),
        R.createElement(
          "button",
          { "data-testid": "page-size", onClick: () => setPageSize(50) },
          "size"
        )
      ),
  }
})

import { LeaveSection } from "@/components/dashboard/hr/leave"
import { TooltipProvider } from "@/components/ui/tooltip"

function makeRow(o: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 0,
    requestCode: "LV-0",
    userId: 1,
    employeeName: "Jane Cruz",
    employeeId: "E-1",
    employeeEmail: "jane@example.com",
    leaveType: "VACATION",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
    days: 3,
    dayParts: {},
    status: "PENDING",
    reason: "Trip",
    filedAt: "2026-06-01T00:00:00Z",
    reviewNote: null,
    reviewedByName: null,
    reviewedAt: null,
    ...o,
  }
}

// PENDING with a double-space name → action buttons + `n[0] ?? ""` initials branch.
const rPending = makeRow({
  id: 1,
  status: "PENDING",
  employeeName: "Jane  Cruz",
})
// APPROVED with a null filedAt → no actions + `filedAt?.split` short-circuit branch.
const rApproved = makeRow({
  id: 2,
  status: "APPROVED",
  filedAt: null as unknown as string,
})
// RETURNED → no actions.
const rReturned = makeRow({ id: 3, status: "RETURNED" })

const ALL_ROWS = [rPending, rApproved, rReturned]

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <LeaveSection />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  leaveState.data = {
    content: ALL_ROWS,
    totalElements: ALL_ROWS.length,
    totalPages: 1,
  }
  leaveState.isLoading = false
  leaveState.isError = false
  leaveState.approvePending = false
  leaveState.rejectPending = false
  leaveState.returnPending = false
})

describe("LeaveSection — table states", () => {
  it("renders a row per request with employee, type and status", () => {
    renderSection()
    expect(screen.getAllByTestId("leave-mgmt-row")).toHaveLength(3)
    // "Jane  Cruz" (double space) → initials "JC" via the `n[0] ?? ""` guard.
    expect(screen.getAllByText("JC").length).toBe(3)
    expect(screen.getAllByText("Vacation").length).toBeGreaterThan(0)
  })

  it("shows the error banner when the query fails", () => {
    leaveState.isError = true
    renderSection()
    expect(
      screen.getByText(/Failed to load leave requests/i)
    ).toBeInTheDocument()
  })

  it("loading state shows the loading row (no data rows)", () => {
    leaveState.data = undefined
    leaveState.isLoading = true
    renderSection()
    expect(screen.queryAllByTestId("leave-mgmt-row")).toHaveLength(0)
    expect(screen.getByText(/Loading…/)).toBeInTheDocument()
  })

  it("empty result set renders the empty state", () => {
    leaveState.data = { content: [], totalElements: 0, totalPages: 0 }
    renderSection()
    expect(screen.getByText(/No leave requests$/)).toBeInTheDocument()
  })
})

describe("LeaveSection — filters + pagination", () => {
  it("selecting a status filter marks it active", () => {
    renderSection()
    const approvedTab = screen.getByRole("button", { name: "Approved" })
    fireEvent.click(approvedTab)
    expect(approvedTab).toHaveClass("bg-background")
  })

  it("changing the date range does not throw", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("date-range-trigger"))
    expect(screen.getAllByTestId("leave-mgmt-row")).toHaveLength(3)
  })

  it("pagination controls fire the page + page-size callbacks", () => {
    leaveState.data = { content: ALL_ROWS, totalElements: 40, totalPages: 2 }
    renderSection()
    fireEvent.click(screen.getByTestId("page-next"))
    fireEvent.click(screen.getByTestId("page-size"))
    expect(screen.getAllByTestId("leave-mgmt-row")).toHaveLength(3)
  })
})

describe("LeaveSection — review actions", () => {
  it("approve dispatches the approve mutation for the PENDING row", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("leave-approve"))
    expect(approveMutate).toHaveBeenCalledWith({ id: 1 })
    expect(rejectMutate).not.toHaveBeenCalled()
  })

  it("reject dispatches the reject mutation", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("leave-reject"))
    expect(rejectMutate).toHaveBeenCalledWith({ id: 1 })
    expect(approveMutate).not.toHaveBeenCalled()
  })

  it("return is gated on a note, then dispatches and closes on success", () => {
    returnMutate.mockImplementation(
      (_args: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    renderSection()
    fireEvent.click(screen.getByTestId("leave-return"))
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByText(/Send Jane Cruz's leave request back/)
    ).toBeInTheDocument()

    const confirm = screen.getByTestId("leave-review-return")
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(returnMutate).not.toHaveBeenCalled()

    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "Please shorten the range." },
    })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    expect(returnMutate).toHaveBeenCalledWith(
      { id: 1, reviewNote: "Please shorten the range." },
      expect.anything()
    )
    // onSuccess closed the dialog.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("the return dialog can be cancelled", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("leave-return"))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("Escape closes the return dialog (drives onOpenChange)", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("leave-return"))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("approve + reject buttons are disabled while their mutations are pending", () => {
    leaveState.approvePending = true
    leaveState.rejectPending = true
    renderSection()
    expect(screen.getByTestId("leave-approve")).toBeDisabled()
    expect(screen.getByTestId("leave-reject")).toBeDisabled()
  })

  it("the return confirm shows the busy label while the mutation is pending", () => {
    renderSection()
    // Open the dialog while idle (the trigger is disabled once returning starts).
    fireEvent.click(screen.getByTestId("leave-return"))
    const dialog = screen.getByRole("dialog")
    // Flip to pending, then force a re-render via a textbox change.
    leaveState.returnPending = true
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "x" },
    })
    const confirm = screen.getByTestId("leave-review-return")
    expect(confirm).toHaveTextContent("Returning…")
    expect(confirm).toBeDisabled()
  })

  it("only PENDING rows expose review actions", () => {
    renderSection()
    // Exactly one approve button — the single PENDING row.
    expect(screen.getAllByTestId("leave-approve")).toHaveLength(1)
  })
})
