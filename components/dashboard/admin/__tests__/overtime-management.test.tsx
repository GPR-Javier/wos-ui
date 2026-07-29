import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { OvertimeRequest } from "@/lib/overtime-api"

// ── Hoisted mutable state + per-endpoint spies the mocked hooks read ─────────────
const {
  authorizeMutate,
  rejectAuthMutate,
  returnAuthMutate,
  approveClaimMutate,
  rejectClaimMutate,
  returnClaimMutate,
  legacyApproveMutate,
  legacyRejectMutate,
  state,
} = vi.hoisted(() => ({
  authorizeMutate: vi.fn(),
  rejectAuthMutate: vi.fn(),
  returnAuthMutate: vi.fn(),
  approveClaimMutate: vi.fn(),
  rejectClaimMutate: vi.fn(),
  returnClaimMutate: vi.fn(),
  legacyApproveMutate: vi.fn(),
  legacyRejectMutate: vi.fn(),
  state: {
    data: undefined as
      | {
          content: OvertimeRequest[]
          totalElements: number
          totalPages: number
        }
      | undefined,
    isLoading: false,
    busy: false,
  },
}))

vi.mock("@/hooks/use-overtime", () => ({
  useAllOvertimeRequests: () => ({
    data: state.data,
    isLoading: state.isLoading,
  }),
  useApproveOvertimeRequest: () => ({
    mutate: legacyApproveMutate,
    isPending: state.busy,
  }),
  useRejectOvertimeRequest: () => ({
    mutate: legacyRejectMutate,
    isPending: state.busy,
  }),
  useAuthorizeOvertime: () => ({
    mutate: authorizeMutate,
    isPending: state.busy,
  }),
  useRejectOvertimeAuthorization: () => ({
    mutate: rejectAuthMutate,
    isPending: state.busy,
  }),
  useReturnOvertimeAuthorization: () => ({
    mutate: returnAuthMutate,
    isPending: state.busy,
  }),
  useApproveOvertimeClaim: () => ({
    mutate: approveClaimMutate,
    isPending: state.busy,
  }),
  useRejectOvertimeClaim: () => ({
    mutate: rejectClaimMutate,
    isPending: state.busy,
  }),
  useReturnOvertimeClaim: () => ({
    mutate: returnClaimMutate,
    isPending: state.busy,
  }),
}))

// Stub the bulk dialog (covered by its own spec).
vi.mock("@/components/custom/overtime-bulk-authorize-dialog", () => ({
  OvertimeBulkAuthorizeDialog: ({
    open,
    onClose,
  }: {
    open: boolean
    onClose: () => void
  }) =>
    open ? (
      <div data-testid="bulk-dialog">
        <button data-testid="bulk-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}))

// Trivial date-range trigger; keep the real useDateRange.
vi.mock("@/components/custom/date-range-filter", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/components/custom/date-range-filter")
    >()
  return {
    ...actual,
    DateRangeFilter: ({
      onChange,
    }: {
      onChange: (v: { from: string; until: string }) => void
    }) => (
      <button
        data-testid="date-range-trigger"
        onClick={() => onChange({ from: "2026-02-01", until: "2026-02-28" })}
      >
        range
      </button>
    ),
  }
})

// Stub pagination — expose the page callback so the parent's setPage runs.
vi.mock("@/components/custom/table-pagination", () => ({
  TablePagination: ({
    page,
    setPage,
    setPageSize,
  }: {
    page: number
    setPage: (p: number) => void
    setPageSize: (s: number) => void
  }) => (
    <div data-testid="pagination">
      <button data-testid="page-next" onClick={() => setPage(page + 1)}>
        next
      </button>
      <button data-testid="page-size" onClick={() => setPageSize(50)}>
        size
      </button>
    </div>
  ),
}))

import { OvertimeManagementSection } from "@/components/dashboard/admin/overtime-management"

function makeRow(o: Partial<OvertimeRequest>): OvertimeRequest {
  return {
    id: 0,
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
    createdAt: "2026-07-10T08:00:00Z",
    updatedAt: "2026-07-10T08:00:00Z",
    ...o,
  }
}

const rAuth = makeRow({
  id: 1,
  status: "PENDING_AUTH",
  reason: "auth-row",
  userName: "Alice Auth",
  userEmail: "alice@example.com",
})
const rClaim = makeRow({
  id: 2,
  status: "PENDING_CLAIM",
  reason: "claim-row",
  userName: "Bob Claim",
  userEmail: "bob@example.com",
  startTime: "08:00",
  endTime: "17:00",
  totalHours: 8,
  adminInitiated: true,
  attachmentUrls: ["https://x/att.pdf"],
})
const rEmergency = makeRow({
  id: 3,
  status: "PENDING_EMERGENCY_CLAIM",
  reason: "emergency-row",
  startTime: "22:00",
  endTime: "23:30",
  totalHours: 1.5,
})
const rLegacy = makeRow({
  id: 4,
  status: "PENDING",
  reason: "legacy-row",
  startTime: "18:00",
  endTime: "20:00",
  totalHours: 2,
})
const rApproved = makeRow({
  id: 5,
  status: "APPROVED",
  reason: "approved-row",
  startTime: "18:00",
  endTime: "20:00",
  totalHours: 3,
})
// Planned times null → fmt12("—") + fmtHours(null) branches; has a review note for view mode.
const rReturned = makeRow({
  id: 6,
  status: "RETURNED",
  reason: "returned-row",
  plannedStartTime: null,
  plannedEndTime: null,
  plannedHours: null,
  reviewNote: "please fix",
})

const ALL_ROWS = [rAuth, rClaim, rEmergency, rLegacy, rApproved, rReturned]

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <OvertimeManagementSection />
    </QueryClientProvider>
  )
}

function rowByReason(reason: string) {
  return screen.getByText(reason).closest("tr") as HTMLElement
}
function openReview(
  reason: string,
  name: "View" | "Approve" | "Return" | "Reject"
) {
  fireEvent.click(within(rowByReason(reason)).getByRole("button", { name }))
  return screen.getByRole("dialog")
}

beforeEach(() => {
  vi.clearAllMocks()
  state.data = {
    content: ALL_ROWS,
    totalElements: ALL_ROWS.length,
    totalPages: 1,
  }
  state.isLoading = false
  state.busy = false
})

describe("OvertimeManagementSection — table + stats", () => {
  it("renders a row per request and the queue badge counts", () => {
    renderSection()
    expect(screen.getByText("auth-row")).toBeInTheDocument()
    expect(screen.getByText("claim-row")).toBeInTheDocument()
    // Authorization badge (1) + claim badge (2).
    const authTab = screen.getByRole("button", { name: /Authorizations/ })
    expect(within(authTab).getByText("1")).toBeInTheDocument()
    const claimTab = screen.getByRole("button", { name: /Claims/ })
    expect(within(claimTab).getByText("2")).toBeInTheDocument()
  })

  it("loading renders skeletons and no data rows", () => {
    state.data = undefined
    state.isLoading = true
    renderSection()
    expect(screen.queryByText("auth-row")).not.toBeInTheDocument()
  })

  it("empty queue renders the empty state", () => {
    state.data = { content: [], totalElements: 0, totalPages: 0 }
    renderSection()
    expect(screen.getByText("Nothing in this queue.")).toBeInTheDocument()
  })

  it("opens and closes the bulk pre-authorize dialog", () => {
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: /Bulk pre-authorize/i }))
    expect(screen.getByTestId("bulk-dialog")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("bulk-close"))
    expect(screen.queryByTestId("bulk-dialog")).not.toBeInTheDocument()
  })
})

describe("OvertimeManagementSection — filters", () => {
  it("switches queues to narrow the visible rows", () => {
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: /Authorizations/ }))
    expect(screen.getByText("auth-row")).toBeInTheDocument()
    expect(screen.queryByText("claim-row")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Claims/ }))
    expect(screen.getByText("claim-row")).toBeInTheDocument()
    expect(screen.getByText("emergency-row")).toBeInTheDocument()
    expect(screen.queryByText("auth-row")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "History" }))
    expect(screen.getByText("approved-row")).toBeInTheDocument()
    expect(screen.queryByText("auth-row")).not.toBeInTheDocument()
  })

  it("searches by employee name and email", () => {
    renderSection()
    const box = screen.getByPlaceholderText("Search employee…")
    fireEvent.change(box, { target: { value: "alice" } })
    expect(screen.getByText("auth-row")).toBeInTheDocument()
    expect(screen.queryByText("claim-row")).not.toBeInTheDocument()

    fireEvent.change(box, { target: { value: "bob@example.com" } })
    expect(screen.getByText("claim-row")).toBeInTheDocument()
    expect(screen.queryByText("auth-row")).not.toBeInTheDocument()
  })

  it("date-range change keeps the table rendered", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("date-range-trigger"))
    expect(screen.getByText("auth-row")).toBeInTheDocument()
  })

  it("paginates when there is more than one page", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeRow({ id: 100 + i, status: "APPROVED", reason: `bulk-${i}` })
    )
    state.data = { content: many, totalElements: 25, totalPages: 2 }
    renderSection()
    expect(screen.getByTestId("pagination")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("page-next"))
    fireEvent.click(screen.getByTestId("page-size"))
    expect(screen.getByTestId("pagination")).toBeInTheDocument()
  })
})

describe("OvertimeManagementSection — row actions gating", () => {
  it("exposes review actions on pending rows only", () => {
    renderSection()
    const authRow = rowByReason("auth-row")
    expect(
      within(authRow).getByRole("button", { name: "Approve" })
    ).toBeInTheDocument()
    const approvedRow = rowByReason("approved-row")
    expect(
      within(approvedRow).queryByRole("button", { name: "Approve" })
    ).not.toBeInTheDocument()
    expect(
      within(approvedRow).getByRole("button", { name: "View" })
    ).toBeInTheDocument()
  })
})

describe("OvertimeManagementSection — review modal (authorization phase)", () => {
  it("view mode shows details, the pre-auth confirmation note and rate copy", () => {
    renderSection()
    const dialog = openReview("claim-row", "View")
    expect(
      within(dialog).getByText("Overtime Request Details")
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText("Pre-authorized by management.")
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/View attachment 1/)).toBeInTheDocument()
    const closeButtons = within(dialog).getAllByRole("button", {
      name: "Close",
    })
    fireEvent.click(closeButtons[closeButtons.length - 1])
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("view mode shows an existing review note and em-dash planned times", () => {
    renderSection()
    const dialog = openReview("returned-row", "View")
    expect(within(dialog).getByText("please fix")).toBeInTheDocument()
    expect(within(dialog).getAllByText(/—/).length).toBeGreaterThan(0)
  })

  it("authorizes a PENDING_AUTH request", () => {
    authorizeMutate.mockImplementation(
      (_a: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    renderSection()
    const dialog = openReview("auth-row", "Approve")
    expect(within(dialog).getByText("Authorize Overtime")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Authorize" }))
    expect(authorizeMutate).toHaveBeenCalledWith(
      { id: 1, reviewNote: null },
      expect.anything()
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("rejects a PENDING_AUTH request", () => {
    renderSection()
    const dialog = openReview("auth-row", "Reject")
    expect(within(dialog).getByText("Reject Authorization")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }))
    expect(rejectAuthMutate).toHaveBeenCalledWith(
      { id: 1, reviewNote: null },
      expect.anything()
    )
  })

  it("returns a PENDING_AUTH request only after a note is supplied", () => {
    renderSection()
    const dialog = openReview("auth-row", "Return")
    const confirm = within(dialog).getByRole("button", {
      name: "Return for revision",
    })
    expect(confirm).toBeDisabled()
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "add the client approval" },
    })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    expect(returnAuthMutate).toHaveBeenCalledWith(
      { id: 1, reviewNote: "add the client approval" },
      expect.anything()
    )
  })
})

describe("OvertimeManagementSection — review modal (claim phase)", () => {
  it("approves an actual-hours claim", () => {
    renderSection()
    const dialog = openReview("claim-row", "Approve")
    expect(within(dialog).getByText("Approve Actual Hours")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }))
    expect(approveClaimMutate).toHaveBeenCalledWith(
      { id: 2, reviewNote: null },
      expect.anything()
    )
  })

  it("rejects a claim", () => {
    renderSection()
    const dialog = openReview("claim-row", "Reject")
    expect(within(dialog).getByText("Reject Claim")).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }))
    expect(rejectClaimMutate).toHaveBeenCalledWith(
      { id: 2, reviewNote: null },
      expect.anything()
    )
  })

  it("returns a claim with a note", () => {
    renderSection()
    const dialog = openReview("emergency-row", "Return")
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "recheck the totals" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Return for revision" })
    )
    expect(returnClaimMutate).toHaveBeenCalledWith(
      { id: 3, reviewNote: "recheck the totals" },
      expect.anything()
    )
  })
})

describe("OvertimeManagementSection — review modal (legacy PENDING)", () => {
  it("approves a legacy request via the legacy endpoint", () => {
    renderSection()
    const dialog = openReview("legacy-row", "Approve")
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }))
    expect(legacyApproveMutate).toHaveBeenCalledWith(
      { id: 4, reviewNote: null },
      expect.anything()
    )
  })

  it("rejects a legacy request via the legacy endpoint", () => {
    renderSection()
    const dialog = openReview("legacy-row", "Reject")
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }))
    expect(legacyRejectMutate).toHaveBeenCalledWith(
      { id: 4, reviewNote: null },
      expect.anything()
    )
  })

  it("shows the busy approve label and disables Cancel while a mutation runs", () => {
    state.busy = true
    renderSection()
    const dialog = openReview("auth-row", "Approve")
    expect(
      within(dialog).getByRole("button", { name: "Saving…" })
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("button", { name: "Cancel" })
    ).toBeDisabled()
  })

  it("shows the busy reject label while a mutation runs", () => {
    state.busy = true
    renderSection()
    const dialog = openReview("auth-row", "Reject")
    expect(
      within(dialog).getByRole("button", { name: "Rejecting…" })
    ).toBeDisabled()
  })

  it("shows the busy return label while a mutation runs", () => {
    state.busy = true
    renderSection()
    const dialog = openReview("auth-row", "Return")
    expect(
      within(dialog).getByRole("button", { name: "Returning…" })
    ).toBeDisabled()
  })

  it("formats noon and midnight times with the 12-hour clock", () => {
    state.data = {
      content: [
        makeRow({
          id: 50,
          status: "APPROVED",
          reason: "noon-row",
          startTime: "12:00",
          endTime: "00:15",
          totalHours: 1,
        }),
      ],
      totalElements: 1,
      totalPages: 1,
    }
    renderSection()
    // 12:00 → "12:00 PM" (h % 12 || 12), 00:15 → "12:15 AM".
    expect(screen.getByText(/12:00 PM/)).toBeInTheDocument()
    expect(screen.getByText(/12:15 AM/)).toBeInTheDocument()
  })
})
