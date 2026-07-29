import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

// ── Hoisted mutable state the mocked hooks read on every render ─────────────────
const { bulkMutate, state, graph } = vi.hoisted(() => ({
  bulkMutate: vi.fn(),
  state: { pending: false, isError: false, error: undefined as unknown },
  graph: {
    nodes: undefined as
      | Array<{
          id: number
          name: string
          title?: string
          department?: string
        }>
      | undefined,
    loading: false,
  },
}))

vi.mock("@/hooks/use-org-chart", () => ({
  useOrgGraph: () => ({
    data: graph.nodes ? { nodes: graph.nodes } : undefined,
    isLoading: graph.loading,
  }),
}))
vi.mock("@/hooks/use-overtime", () => ({
  useBulkAuthorizeOvertime: () => ({
    mutate: bulkMutate,
    isPending: state.pending,
    isError: state.isError,
    error: state.error,
  }),
}))

import { OvertimeBulkAuthorizeDialog } from "@/components/custom/overtime-bulk-authorize-dialog"

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`
}
const FUTURE = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return iso(d)
})()
const PAST = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 10)
  return iso(d)
})()

const NODES = [
  { id: 1, name: "Alice Reyes", title: "Engineer", department: "Engineering" },
  { id: 2, name: "Bob Santos", title: "Manager", department: "Sales" },
  { id: 3, name: "Cara Diaz" }, // no title/department → "—" + skipped from departments
]

function renderDialog(onClose = vi.fn(), open = true) {
  render(<OvertimeBulkAuthorizeDialog open={open} onClose={onClose} />)
  return { onClose }
}

function dateInput() {
  return document.querySelector<HTMLInputElement>('input[type="date"]')!
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
  graph.nodes = NODES
  graph.loading = false
})

describe("OvertimeBulkAuthorizeDialog — render + list states", () => {
  it("renders nothing while closed", () => {
    renderDialog(vi.fn(), false)
    expect(
      screen.queryByText("Bulk Pre-authorize Overtime")
    ).not.toBeInTheDocument()
  })

  it("lists every employee, using an em dash when title + department are absent", () => {
    renderDialog()
    expect(screen.getByText("Alice Reyes")).toBeInTheDocument()
    expect(screen.getByText("Cara Diaz")).toBeInTheDocument()
    expect(screen.getByText("Engineer · Engineering")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("shows a loading placeholder while the graph loads", () => {
    graph.nodes = undefined
    graph.loading = true
    renderDialog()
    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("shows an empty state and disables 'Select shown' when nobody matches", () => {
    graph.nodes = []
    renderDialog()
    expect(screen.getByText("No employees match.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select shown" })).toBeDisabled()
  })
})

describe("OvertimeBulkAuthorizeDialog — filtering + selection", () => {
  it("picking a department auto-checks its members and narrows the list", () => {
    renderDialog()
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Engineering" },
    })
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(screen.getByText("Alice Reyes")).toBeInTheDocument()
    expect(screen.queryByText("Bob Santos")).not.toBeInTheDocument()
  })

  it("switching back to All departments does not auto-check", () => {
    renderDialog()
    const select = screen.getByRole("combobox")
    fireEvent.change(select, { target: { value: "Engineering" } })
    fireEvent.change(select, { target: { value: "__ALL__" } })
    // Selection from the Engineering pick is retained (1), no new auto-checks.
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(screen.getByText("Bob Santos")).toBeInTheDocument()
  })

  it("searches by name, title and department", () => {
    renderDialog()
    const searchBox = screen.getByPlaceholderText("Search employee…")

    fireEvent.change(searchBox, { target: { value: "bob" } })
    expect(screen.getByText("Bob Santos")).toBeInTheDocument()
    expect(screen.queryByText("Alice Reyes")).not.toBeInTheDocument()

    fireEvent.change(searchBox, { target: { value: "engineer" } })
    expect(screen.getByText("Alice Reyes")).toBeInTheDocument()
    expect(screen.queryByText("Bob Santos")).not.toBeInTheDocument()

    fireEvent.change(searchBox, { target: { value: "sales" } })
    expect(screen.getByText("Bob Santos")).toBeInTheDocument()

    fireEvent.change(searchBox, { target: { value: "zzz-nobody" } })
    expect(screen.getByText("No employees match.")).toBeInTheDocument()
  })

  it("toggles an individual checkbox on and off", () => {
    renderDialog()
    const boxes = screen.getAllByRole("checkbox")
    fireEvent.click(boxes[0])
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    fireEvent.click(boxes[0])
    expect(screen.getByText("0 selected")).toBeInTheDocument()
  })

  it("Select shown checks everyone visible, then Clear shown unchecks them", () => {
    renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Select shown" }))
    expect(screen.getByText("3 selected")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Clear shown" }))
    expect(screen.getByText("0 selected")).toBeInTheDocument()
  })
})

describe("OvertimeBulkAuthorizeDialog — validation + submit", () => {
  it("blocks a past date", () => {
    renderDialog()
    fireEvent.change(dateInput(), { target: { value: PAST } })
    expect(
      screen.getByText("Pre-authorization is for upcoming work.")
    ).toBeInTheDocument()
  })

  it("shows the estimated window once a valid range is entered", () => {
    renderDialog()
    const { start, end } = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "21:00" } })
    expect(screen.getByText("Estimated window")).toBeInTheDocument()
  })

  it("shows a bare 'Authorize' label with no selection", () => {
    renderDialog()
    expect(
      screen.getByRole("button", { name: "Authorize" })
    ).toBeInTheDocument()
  })

  it("authorizes the staged batch and closes on success", () => {
    bulkMutate.mockImplementation(
      (_a: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()
    )
    const { onClose } = renderDialog()
    fireEvent.change(dateInput(), { target: { value: FUTURE } })
    const { start, end } = timeInputs()
    fireEvent.change(start, { target: { value: "18:00" } })
    fireEvent.change(end, { target: { value: "21:00" } })
    fireEvent.change(
      screen.getByPlaceholderText(/Why is this overtime planned/i),
      {
        target: { value: "Quarter-end push" },
      }
    )
    fireEvent.click(screen.getByRole("button", { name: "Select shown" }))
    fireEvent.click(screen.getByRole("button", { name: "Authorize 3" }))
    expect(bulkMutate).toHaveBeenCalledWith(
      {
        overtimeDate: FUTURE,
        plannedStartTime: "18:00",
        plannedEndTime: "21:00",
        reason: "Quarter-end push",
        userIds: [1, 2, 3],
      },
      expect.anything()
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("shows the busy label and disables actions while pending", () => {
    state.pending = true
    renderDialog()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Authorizing…" })).toBeDisabled()
  })

  it("Cancel and Escape both close the dialog", () => {
    const { onClose } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("renders the API error message when the mutation errors", () => {
    state.isError = true
    state.error = { response: { data: { message: "Scope exceeded." } } }
    renderDialog()
    expect(screen.getByText("Scope exceeded.")).toBeInTheDocument()
  })

  it("falls back to a generic error message when none is provided", () => {
    state.isError = true
    state.error = {}
    renderDialog()
    expect(
      screen.getByText(/Failed to pre-authorize\. Please try again\./)
    ).toBeInTheDocument()
  })
})
