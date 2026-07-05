import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ObRequest } from "@/lib/ob-api"

// ── Mutable state + spies the mocked hooks read on every render ────────────────
const { deleteMutate, cancelMutate, submitMutate, obState } = vi.hoisted(
  () => ({
    deleteMutate: vi.fn(),
    cancelMutate: vi.fn(),
    submitMutate: vi.fn(),
    obState: {
      paged: undefined as
        | { content: ObRequest[]; totalElements: number; totalPages: number }
        | undefined,
      loading: false,
      deletePending: false,
      cancelPending: false,
      submitPending: false,
    },
  })
)

vi.mock("@/hooks/use-ob", () => ({
  useMyObRequests: () => ({ data: obState.paged, isLoading: obState.loading }),
  useDeleteObRequest: () => ({
    mutate: deleteMutate,
    isPending: obState.deletePending,
  }),
  useCancelObRequest: () => ({
    mutate: cancelMutate,
    isPending: obState.cancelPending,
  }),
  useSubmitObDraft: () => ({
    mutate: submitMutate,
    isPending: obState.submitPending,
  }),
}))

// Stub the shared OB form modal (covered by its own spec) — expose open/editing.
vi.mock("@/components/custom/ob-modal", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/custom/ob-modal")>()
  const R = await import("react")
  return {
    ...actual, // keep the real OB_DURATION_LABEL map
    ObModal: ({
      open,
      onClose,
      editing,
    }: {
      open: boolean
      onClose: () => void
      editing?: ObRequest | null
    }) =>
      open
        ? R.createElement(
            "div",
            { "data-testid": "ob-modal" },
            R.createElement(
              "span",
              null,
              editing ? `editing-${editing.id}` : "creating"
            ),
            R.createElement(
              "button",
              { "data-testid": "ob-modal-close", onClick: onClose },
              "close"
            )
          )
        : null,
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

import { MyObSection } from "@/components/dashboard/employee/my-ob"

// ── Fixtures ──────────────────────────────────────────────────────────────────
function makeRow(o: Partial<ObRequest>): ObRequest {
  return {
    id: 0,
    userId: 1,
    userName: "Jane",
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

const rPending = makeRow({ id: 1, status: "PENDING" })
const rApproved = makeRow({
  id: 2,
  status: "APPROVED",
  duration: "CUSTOM",
  customStartTime: "09:15",
  customEndTime: "13:30",
  notes: "See you there",
  reviewNote: "Cleared to proceed",
  reviewedByName: "Admin",
  reviewedAt: "2026-07-02T03:00:00Z",
})
const rDraft = makeRow({
  id: 3,
  status: "DRAFT",
  duration: "CUSTOM",
  customStartTime: "00:00",
  customEndTime: "12:00",
})
const rReturned = makeRow({
  id: 4,
  status: "RETURNED",
  duration: "CUSTOM",
  customStartTime: null,
  customEndTime: null,
  reviewNote: "Fix the venue",
  reviewedByName: "Boss",
  reviewedAt: null,
})
const rRejected = makeRow({
  id: 5,
  status: "REJECTED",
  notes: "context here",
  reviewNote: "No",
  reviewedByName: null,
})

const ALL_ROWS = [rPending, rApproved, rDraft, rReturned, rRejected]

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MyObSection />
    </QueryClientProvider>
  )
}

/** Open the row-detail dialog for the row at the given index. */
function openDetail(index: number) {
  fireEvent.click(screen.getAllByTestId("ob-row")[index])
  return screen.getByRole("dialog")
}

beforeEach(() => {
  vi.clearAllMocks()
  obState.paged = {
    content: ALL_ROWS,
    totalElements: ALL_ROWS.length,
    totalPages: 1,
  }
  obState.loading = false
  obState.deletePending = false
  obState.cancelPending = false
  obState.submitPending = false
})

describe("MyObSection — table + stats", () => {
  it("renders a row per request and formats custom durations", () => {
    renderSection()
    expect(screen.getAllByTestId("ob-row")).toHaveLength(5)
    expect(screen.getByText(/9:15 AM – 1:30 PM/)).toBeInTheDocument()
    expect(screen.getByText(/12:00 AM – 12:00 PM/)).toBeInTheDocument()
    expect(screen.getByText(/— – —/)).toBeInTheDocument()
  })

  it("empty state offers a 'File a request' shortcut that opens the create modal", () => {
    obState.paged = { content: [], totalElements: 0, totalPages: 0 }
    renderSection()
    expect(screen.getByText(/No requests found/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /File a request/i }))
    expect(screen.getByTestId("ob-modal")).toHaveTextContent("creating")
  })

  it("loading state renders skeletons and no rows", () => {
    obState.paged = undefined
    obState.loading = true
    renderSection()
    expect(screen.queryAllByTestId("ob-row")).toHaveLength(0)
  })
})

describe("MyObSection — toolbar interactions", () => {
  it("New Request opens the create modal", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("ob-new-request"))
    expect(screen.getByTestId("ob-modal")).toHaveTextContent("creating")
  })

  it("closing the modal returns to the list", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("ob-new-request"))
    fireEvent.click(screen.getByTestId("ob-modal-close"))
    expect(screen.queryByTestId("ob-modal")).not.toBeInTheDocument()
  })

  it("status filter marks the chosen tab active", () => {
    renderSection()
    const draftTab = screen.getByRole("button", { name: "Draft" })
    fireEvent.click(draftTab)
    expect(draftTab).toHaveClass("bg-background")
  })

  it("date range change keeps the table rendered", () => {
    renderSection()
    fireEvent.click(screen.getByTestId("date-range-trigger"))
    expect(screen.getAllByTestId("ob-row")).toHaveLength(5)
  })

  it("pagination controls fire when there is more than one page", () => {
    obState.paged = { content: ALL_ROWS, totalElements: 40, totalPages: 2 }
    renderSection()
    fireEvent.click(screen.getByTestId("page-next"))
    fireEvent.click(screen.getByTestId("page-size"))
    expect(screen.getAllByTestId("ob-row")).toHaveLength(5)
  })
})

describe("MyObSection — row actions", () => {
  it("editable rows expose Edit (opens the edit modal)", () => {
    renderSection()
    // rPending (index 0) is PENDING → editable.
    const row = screen.getAllByTestId("ob-row")[0]
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }))
    expect(screen.getByTestId("ob-modal")).toHaveTextContent("editing-1")
  })

  it("approved rows show a dash and no edit/delete controls", () => {
    renderSection()
    const approvedRow = screen.getAllByTestId("ob-row")[1]
    expect(
      within(approvedRow).queryByRole("button", { name: "Edit" })
    ).not.toBeInTheDocument()
    expect(
      within(approvedRow).queryByRole("button", { name: "Delete" })
    ).not.toBeInTheDocument()
  })

  it("delete button opens the confirm dialog; Cancel dismisses it", () => {
    renderSection()
    const row = screen.getAllByTestId("ob-row")[0]
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText(/Delete request\?/i)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByText(/Delete request\?/i)).not.toBeInTheDocument()
  })

  it("confirming delete dispatches the mutation and closes on success", () => {
    // Drive the onSuccess callback so the dialog dismisses itself.
    deleteMutate.mockImplementation(
      (_id: number, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    renderSection()
    const row = screen.getAllByTestId("ob-row")[0]
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))
    expect(deleteMutate).toHaveBeenCalledTimes(1)
    expect(deleteMutate.mock.calls[0][0]).toBe(1)
    expect(screen.queryByText(/Delete request\?/i)).not.toBeInTheDocument()
  })

  it("Escape on the delete confirm dialog dismisses it", () => {
    renderSection()
    const row = screen.getAllByTestId("ob-row")[0]
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }))
    expect(screen.getByText(/Delete request\?/i)).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(screen.queryByText(/Delete request\?/i)).not.toBeInTheDocument()
  })

  it("delete confirm shows the busy label while pending", () => {
    obState.deletePending = true
    renderSection()
    const row = screen.getAllByTestId("ob-row")[0]
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }))
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByRole("button", { name: /Deleting…/i })
    ).toBeDisabled()
  })
})

describe("MyObSection — detail dialog", () => {
  it("PENDING detail can be cancelled", () => {
    renderSection()
    const dialog = openDetail(0)
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Cancel Request/i })
    )
    expect(cancelMutate).toHaveBeenCalledWith(1, expect.anything())
  })

  it("PENDING detail shows the busy cancel label", () => {
    obState.cancelPending = true
    renderSection()
    const dialog = openDetail(0)
    expect(within(dialog).getByText(/Cancelling…/i)).toBeInTheDocument()
  })

  it("APPROVED detail shows notes and the reviewer remark with name + date", () => {
    renderSection()
    const dialog = openDetail(1)
    expect(within(dialog).getByText("See you there")).toBeInTheDocument()
    expect(within(dialog).getByText("Cleared to proceed")).toBeInTheDocument()
    // Attribution line: "— Admin, <date>"
    expect(within(dialog).getByText(/^—\s*Admin/)).toBeInTheDocument()
  })

  it("DRAFT detail can be submitted for approval", () => {
    renderSection()
    const dialog = openDetail(2)
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Submit for Approval/i })
    )
    expect(submitMutate).toHaveBeenCalledWith(3, expect.anything())
  })

  it("DRAFT detail shows the busy submit label", () => {
    obState.submitPending = true
    renderSection()
    const dialog = openDetail(2)
    expect(within(dialog).getByText(/Submitting…/i)).toBeInTheDocument()
  })

  it("RETURNED detail 'Edit & Resubmit' closes detail and opens the edit modal", () => {
    renderSection()
    const dialog = openDetail(3)
    // reviewer remark present, but no review date → no date suffix.
    expect(within(dialog).getByText("Fix the venue")).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Edit .* Resubmit/i })
    )
    expect(screen.getByTestId("ob-modal")).toHaveTextContent("editing-4")
  })

  it("REJECTED detail shows the remark without an attribution line and just closes", () => {
    renderSection()
    const dialog = openDetail(4)
    expect(within(dialog).getByText("context here")).toBeInTheDocument()
    expect(within(dialog).getByText("No")).toBeInTheDocument()
    const closeButtons = within(dialog).getAllByRole("button", {
      name: "Close",
    })
    fireEvent.click(closeButtons[closeButtons.length - 1])
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
