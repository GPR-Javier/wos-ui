import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Spy mutate fns + the approved-OB rows the date pre-check reads, shared with the mocked modules.
const { createMutate, updateMutate, approvedOb } = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  approvedOb: { content: [] as Array<{ id: number; obDate: string }> },
}))

vi.mock("@/hooks/use-ob", () => ({
  useCreateObRequest: () => ({ mutate: createMutate, isPending: false }),
  useUpdateObRequest: () => ({ mutate: updateMutate, isPending: false }),
  // The date pre-check queries approved OB requests; feed it the hoisted rows.
  useMyObRequests: () => ({ data: approvedOb }),
}))

// The remaining pre-check hooks: return undefined data so those constraints stay dormant.
vi.mock("@/hooks/use-schedule-policy", () => ({
  useMyPolicy: () => ({ data: undefined }),
}))
vi.mock("@/hooks/use-leave", () => ({
  useMyLeaveRequests: () => ({ data: undefined }),
}))
vi.mock("@/hooks/use-holidays", () => ({
  useHolidays: () => ({ data: undefined }),
}))

import { ObModal } from "@/components/custom/ob-modal"

const today = new Date().toISOString().split("T")[0]

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ObModal open onClose={() => {}} />
    </QueryClientProvider>
  )
}

/** Fill the three always-required fields (purpose, location, OB date). */
function fillRequired() {
  fireEvent.change(
    screen.getByPlaceholderText(/Client meeting, training, conference/i),
    { target: { value: "Client meeting" } }
  )
  fireEvent.change(screen.getByPlaceholderText(/Makati office, BGC, Remote/i), {
    target: { value: "BGC" },
  })
  const dateInput = document.querySelector(
    'input[type="date"]'
  ) as HTMLInputElement
  fireEvent.change(dateInput, { target: { value: today } })
}

describe("ObModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    approvedOb.content = []
  })

  it("(b) the OB date input's min attribute equals today's ISO date", () => {
    renderModal()
    const dateInput = document.querySelector(
      'input[type="date"]'
    ) as HTMLInputElement
    expect(dateInput).toBeInTheDocument()
    expect(dateInput.getAttribute("min")).toBe(today)
  })

  it("(a) selecting CUSTOM reveals the two time inputs; Submit stays blocked until both are set", () => {
    renderModal()

    // Time inputs not present under the default FULL_DAY duration.
    expect(document.querySelectorAll('input[type="time"]').length).toBe(0)

    fillRequired()
    fireEvent.click(screen.getByRole("button", { name: /Custom Hours/i }))

    // Two time inputs now revealed.
    const timeInputs = document.querySelectorAll('input[type="time"]')
    expect(timeInputs.length).toBe(2)

    // With CUSTOM but no times, Submit is blocked and create is never called.
    const submitBtn = screen.getByRole("button", { name: /Submit Request/i })
    expect(submitBtn).toBeDisabled()
    fireEvent.click(submitBtn)
    expect(createMutate).not.toHaveBeenCalled()

    // Fill only the start time — still blocked.
    fireEvent.change(timeInputs[0], { target: { value: "09:00" } })
    expect(submitBtn).toBeDisabled()

    // Fill the end time too — now allowed.
    fireEvent.change(timeInputs[1], { target: { value: "12:00" } })
    expect(submitBtn).toBeEnabled()
  })

  it("(c) 'Save as Draft' sends isDraft:true and 'Submit Request' sends isDraft falsy", () => {
    renderModal()
    fillRequired()

    fireEvent.click(screen.getByRole("button", { name: /Save as Draft/i }))
    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(createMutate.mock.calls[0][0]).toMatchObject({ isDraft: true })

    createMutate.mockClear()

    fireEvent.click(screen.getByRole("button", { name: /Submit Request/i }))
    expect(createMutate).toHaveBeenCalledTimes(1)
    expect(createMutate.mock.calls[0][0].isDraft).toBeFalsy()
  })

  it("(d) picking a date that already has an approved OB shows the error and blocks Submit + Draft", () => {
    approvedOb.content = [{ id: 99, obDate: today }]
    renderModal()
    fillRequired() // sets OB date = today, which now collides with an approved OB

    expect(
      screen.getByText(/already have an approved OB request for this date/i)
    ).toBeInTheDocument()

    const submitBtn = screen.getByRole("button", { name: /Submit Request/i })
    const draftBtn = screen.getByRole("button", { name: /Save as Draft/i })
    expect(submitBtn).toBeDisabled()
    expect(draftBtn).toBeDisabled()

    fireEvent.click(submitBtn)
    fireEvent.click(draftBtn)
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("(e) an approved OB on a DIFFERENT date does not block today's request", () => {
    approvedOb.content = [{ id: 99, obDate: "2020-01-01" }]
    renderModal()
    fillRequired()

    expect(
      screen.queryByText(/already have an approved OB request/i)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Submit Request/i })
    ).toBeEnabled()
  })
})
