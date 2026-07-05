import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ObRequest } from "@/lib/ob-api"

// Spy review mutations + the single PENDING row the table renders.
const { approveMutate, rejectMutate, returnMutate, pendingRow } = vi.hoisted(
  () => ({
    approveMutate: vi.fn(),
    rejectMutate: vi.fn(),
    returnMutate: vi.fn(),
    pendingRow: {} as ObRequest,
  })
)

Object.assign(pendingRow, {
  id: 1,
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
} satisfies ObRequest)

vi.mock("@/hooks/use-ob", () => ({
  useAllObRequests: () => ({
    data: {
      content: [pendingRow],
      totalElements: 1,
      totalPages: 1,
    },
    isLoading: false,
  }),
  useApproveObRequest: () => ({ mutate: approveMutate, isPending: false }),
  useRejectObRequest: () => ({ mutate: rejectMutate, isPending: false }),
  useReturnObRequest: () => ({ mutate: returnMutate, isPending: false }),
}))

import { ObManagementSection } from "@/components/dashboard/admin/ob-management"

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

describe("ObManagementSection review actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("approve action opens the modal and dispatches the approve mutation", () => {
    renderSection()
    // Only the row's action button is named "Approve" before the modal opens.
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

  it("return action is disabled until a note is entered, then dispatches the return mutation", () => {
    renderSection()
    fireEvent.click(screen.getByRole("button", { name: "Return" }))

    const dialog = screen.getByRole("dialog")
    const returnBtn = within(dialog).getByRole("button", {
      name: /Return for Revision/i,
    })
    // Gated: empty note keeps the confirm button disabled.
    expect(returnBtn).toBeDisabled()
    fireEvent.click(returnBtn)
    expect(returnMutate).not.toHaveBeenCalled()

    // Enter a note → enabled → dispatches with the typed note.
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
})
