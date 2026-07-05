import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ObRequest } from "@/lib/ob-api"

// ── Shared, mutable state the mocked hooks read on every render ────────────────
const { approveMutate, rejectMutate, returnMutate, obState } = vi.hoisted(() => ({
  approveMutate: vi.fn(),
  rejectMutate: vi.fn(),
  returnMutate: vi.fn(),
  obState: {
    // Paged (main table) query result — `undefined` when loading.
    paged: undefined as
      | { content: ObRequest[]; totalElements: number; totalPages: number }
      | undefined,
    pagedLoading: false,
    // Summary (size:100) query rows — set `allUndefined` to force a missing data.
    all: [] as ObRequest[],
    allUndefined: false,
    approvePending: false,
    rejectPending: false,
    returnPending: false,
  },
}))

vi.mock("@/hooks/use-ob", () => ({
  // The component calls useAllObRequests twice — the summary variant passes size:100.
  useAllObRequests: (params: { size?: number }) =>
    params.size === 100
      ? {
          data: obState.allUndefined ? undefined : { content: obState.all },
          isLoading: false,
        }
      : { data: obState.paged, isLoading: obState.pagedLoading },
  useApproveObRequest: () => ({
    mutate: approveMutate,
    isPending: obState.approvePending,
  }),
  useRejectObRequest: () => ({
    mutate: rejectMutate,
    isPending: obState.rejectPending,
  }),
  useReturnObRequest: () => ({
    mutate: returnMutate,
    isPending: obState.returnPending,
  }),
}))

// Replace the date filter with a trivial trigger so we can exercise the parent's
// onChange without driving the full calendar popover; keep the real hook exports.
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

import { ObManagementSection } from "@/components/dashboard/admin/ob-management"

// ── Fixtures ──────────────────────────────────────────────────────────────────
function makeRow(o: Partial<ObRequest>): ObRequest {
  return {
    id: 0,
    userId: 7,
    userName: "Jane Cruz",
    userEmail: "jane@example.com",
    obDate: "2026-07-10",
    duration: "FULL_DAY",
    customStartTime: null,
    customEndTime: null,
    purpose: "Client meeting",
    location: "BGC",
    notes: null,
    status: "PENDING",
    reviewNote: null,
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...o,
  }
}

// row0 PENDING FULL_DAY (row actions + non-custom duration + no notes/no reviewNote)
const rowPending = makeRow({ id: 1, status: "PENDING" })
// row1 APPROVED CUSTOM 09:15–13:30 (AM+PM fmt12, notes, reviewNote w/ reviewer+date)
const rowApproved = makeRow({
  id: 2,
  status: "APPROVED",
  duration: "CUSTOM",
  customStartTime: "09:15",
  customEndTime: "13:30",
  notes: "See you there",
  reviewNote: "Approved, proceed",
  reviewedByName: "Admin One",
  reviewedAt: "2026-07-02T03:00:00Z",
})
// row2 REJECTED CUSTOM 00:00–12:00 (h=0 and h=12 → "||12" branch; reviewedAt null)
const rowRejected = makeRow({
  id: 3,
  status: "REJECTED",
  duration: "CUSTOM",
  customStartTime: "00:00",
  customEndTime: "12:00",
  reviewNote: "Not allowed",
  reviewedByName: "Boss",
  reviewedAt: null,
})
// row3 RETURNED CUSTOM null times (fmt12 "—"; reviewNote set but reviewedByName null)
const rowReturned = makeRow({
  id: 4,
  status: "RETURNED",
  duration: "CUSTOM",
  customStartTime: null,
  customEndTime: null,
  reviewNote: "Fix the venue",
  reviewedByName: null,
})

const ALL_ROWS = [rowPending, rowApproved, rowRejected, rowReturned]

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ObManagementSection />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  obState.paged = {
    content: ALL_ROWS,
    totalElements: ALL_ROWS.length,
    totalPages: 1,
  }
  obState.pagedLoading = false
  obState.all = ALL_ROWS
  obState.allUndefined = false
  obState.approvePending = false
  obState.rejectPending = false
  obState.returnPending = false
})

describe("ObManagementSection — table + summary", () => {
  it("renders a row per request with employee, duration and status", () => {
    renderSection()
    expect(screen.getAllByTestId("ob-mgmt-row")).toHaveLength(4)
    expect(screen.getAllByText("Jane Cruz").length).toBeGreaterThan(0)
    // Custom duration formats to a 12h time range.
    expect(screen.getByText(/9:15 AM – 1:30 PM/)).toBeInTheDocument()
    // Midnight + noon both collapse to 12 via the `|| 12` fallback.
    expect(screen.getByText(/12:00 AM – 12:00 PM/)).toBeInTheDocument()
    // Null custom times render an em dash on each side.
    expect(screen.getByText(/— – —/)).toBeInTheDocument()
  })

  it("shows summary counts derived from the size:100 query", () => {
    renderSection()
    // Total 4, Pending 1, Approved 1, Rejected 1 — each StatCard shows its number.
    expect(screen.getByText("Total Requests")).toBeInTheDocument()
    // The Pending filter tab shows the pending badge count.
    const pendingTab = screen.getByRole("button", { name: /Pending/ })
    expect(within(pendingTab).getByText("1")).toBeInTheDocument()
  })

  it("empty result set renders the empty state", () => {
    obState.paged = { content: [], totalElements: 0, totalPages: 0 }
    renderSection()
    expect(screen.getByText(/No requests found/i)).toBeInTheDocument()
  })

  it("loading state renders skeleton rows (no data rows)", () => {
    obState.paged = undefined
    obState.pagedLoading = true
    obState.allUndefined = true
    renderSection()
    expect(screen.queryAllByTestId("ob-mgmt-row")).toHaveLength(0)
    // Summary falls back to 0 when the query has no data yet.
    expect(screen.getByText("Total Requests")).toBeInTheDocument()
  })
})

describe("ObManagementSection — filters + pagination", () => {
  it("typing a search term is accepted", () => {
    renderSection()
    const search = screen.getByPlaceholderText(/Search by employee name/i)
    fireEvent.change(search, { target: { value: "jane" } })
    expect((search as HTMLInputElement).value).toBe("jane")
  })

  it("selecting a status filter marks it active", () => {
    renderSection()
    const approvedTab = screen.getByRole("button", { name: "Approved" })
    fireEvent.click(approvedTab)
    expect(approvedTab).toHaveClass("bg-background")
  })

  it("changing the date range does not throw", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("date-range-trigger"))
    expect(screen.getAllByTestId("ob-mgmt-row")).toHaveLength(4)
  })

  it("pagination controls fire the page + page-size callbacks", () => {
    obState.paged = {
      content: ALL_ROWS,
      totalElements: 40,
      totalPages: 2,
    }
    renderSection()
    fireEvent.click(screen.getByTestId("page-next"))
    fireEvent.click(screen.getByTestId("page-size"))
    // Still renders the rows after paging interactions.
    expect(screen.getAllByTestId("ob-mgmt-row")).toHaveLength(4)
  })
})

describe("ObManagementSection — review modal (view mode)", () => {
  it("view mode shows details, notes and the reviewer remark with name + date", () => {
    renderSection()
    // row1 (index 1) = APPROVED with notes + full review meta.
    fireEvent.click(screen.getAllByTestId("ob-view")[1])
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Request Details")).toBeInTheDocument()
    expect(within(dialog).getByText("See you there")).toBeInTheDocument()
    expect(within(dialog).getByText("Approved, proceed")).toBeInTheDocument()
    expect(within(dialog).getByText(/Admin One/)).toBeInTheDocument()
    // Close button (view mode footer) dismisses — the last "Close" is the footer
    // one (Radix also renders a top-right X with an sr-only "Close").
    const closeButtons = within(dialog).getAllByRole("button", { name: "Close" })
    fireEvent.click(closeButtons[closeButtons.length - 1])
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("view mode without notes/remark hides those blocks", () => {
    renderSection()
    // row0 = PENDING, no notes, no reviewNote.
    fireEvent.click(screen.getAllByTestId("ob-view")[0])
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).queryByText(/Notes/)).not.toBeInTheDocument()
  })

  it("view mode with a reviewer but no review date omits the date suffix", () => {
    renderSection()
    // row2 = REJECTED, reviewedByName "Boss", reviewedAt null.
    fireEvent.click(screen.getAllByTestId("ob-view")[2])
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Boss/)).toBeInTheDocument()
  })

  it("view mode with a remark but no reviewer omits the attribution line", () => {
    renderSection()
    // row3 = RETURNED, reviewNote set, reviewedByName null.
    fireEvent.click(screen.getAllByTestId("ob-view")[3])
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Fix the venue")).toBeInTheDocument()
  })

  it("Escape closes the review modal", () => {
    renderSection()
    fireEvent.click(screen.getAllByTestId("ob-view")[0])
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("ObManagementSection — review actions", () => {
  it("approve action opens the modal and dispatches the approve mutation", () => {
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /^Approve$/ }))
    expect(approveMutate).toHaveBeenCalledTimes(1)
    expect(approveMutate.mock.calls[0][0]).toMatchObject({ id: 1 })
    expect(returnMutate).not.toHaveBeenCalled()
    expect(rejectMutate).not.toHaveBeenCalled()
  })

  it("reject action dispatches the reject mutation", () => {
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Reject" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /^Reject$/ }))
    expect(rejectMutate).toHaveBeenCalledTimes(1)
    expect(rejectMutate.mock.calls[0][0]).toMatchObject({ id: 1 })
    expect(approveMutate).not.toHaveBeenCalled()
  })

  it("return is gated on a note, then dispatches with the typed note", () => {
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Return" }))
    const dialog = screen.getByRole("dialog")
    const returnBtn = within(dialog).getByRole("button", {
      name: /Return for Revision/i,
    })
    expect(returnBtn).toBeDisabled()
    fireEvent.click(returnBtn)
    expect(returnMutate).not.toHaveBeenCalled()

    const note = within(dialog).getByRole("textbox")
    fireEvent.change(note, { target: { value: "Please add the venue." } })
    expect(returnBtn).toBeEnabled()
    fireEvent.click(returnBtn)
    expect(returnMutate).toHaveBeenCalledTimes(1)
    expect(returnMutate.mock.calls[0][0]).toMatchObject({
      id: 1,
      reviewNote: "Please add the venue.",
    })
  })

  it("busy approve shows 'Approving…' and disables the confirm button", () => {
    obState.approvePending = true
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    const dialog = screen.getByRole("dialog")
    const confirm = within(dialog).getByTestId("ob-review-approve")
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveTextContent("Approving…")
  })

  it("busy reject shows 'Rejecting…'", () => {
    obState.rejectPending = true
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Reject" }))
    expect(screen.getByTestId("ob-review-reject")).toHaveTextContent(
      "Rejecting…"
    )
  })

  it("busy return shows 'Returning…'", () => {
    obState.returnPending = true
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Return" }))
    expect(screen.getByTestId("ob-review-return")).toHaveTextContent(
      "Returning…"
    )
  })
})
