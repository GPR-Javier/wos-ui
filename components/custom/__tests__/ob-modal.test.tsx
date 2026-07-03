import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Spy mutate fns, shared with the mocked hook module.
const { createMutate, updateMutate } = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
}))

vi.mock("@/hooks/use-ob", () => ({
  useCreateObRequest: () => ({ mutate: createMutate, isPending: false }),
  useUpdateObRequest: () => ({ mutate: updateMutate, isPending: false }),
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
})
