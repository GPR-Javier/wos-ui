import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { ReportingRoleDTO } from "@/lib/reporting-role-api"

// ── Shared, mutable state the mocked hooks read on every render ────────────────
const { createMutate, updateMutate, deleteMutate, state } = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  state: {
    roles: [] as ReportingRoleDTO[],
    loading: false,
  },
}))

vi.mock("@/hooks/use-reporting-roles", () => ({
  useReportingRoles: () => ({ data: state.roles, isLoading: state.loading }),
  useCreateReportingRole: () => ({ mutate: createMutate, isPending: false }),
  useUpdateReportingRole: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteReportingRole: () => ({ mutate: deleteMutate, isPending: false }),
}))

import { ReportingRolesConfigSection } from "@/components/dashboard/admin/reporting-roles-config"

const ROLES: ReportingRoleDTO[] = [
  { id: 1, label: "Direct manager", active: true },
  { id: 2, label: "Dotted-line", active: false },
]

describe("ReportingRolesConfigSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.roles = ROLES
    state.loading = false
  })

  it("renders a row per reporting role, active-first", () => {
    render(<ReportingRolesConfigSection />)
    const rows = screen.getAllByTestId("reporting-role-row")
    expect(rows).toHaveLength(2)
    // Sorted active-first: "Direct manager" (active) precedes "Dotted-line" (inactive).
    expect(within(rows[0]!).getByText("Direct manager")).toBeInTheDocument()
    expect(within(rows[0]!).getByText("Active")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Dotted-line")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Inactive")).toBeInTheDocument()
  })

  it("shows the empty state when there are no roles", () => {
    state.roles = []
    render(<ReportingRolesConfigSection />)
    expect(screen.getByText("No reporting roles yet")).toBeInTheDocument()
    expect(screen.queryByTestId("reporting-role-row")).not.toBeInTheDocument()
  })

  it("adds a role: opens the modal, submits the trimmed label", () => {
    render(<ReportingRolesConfigSection />)
    fireEvent.click(screen.getByTestId("reporting-role-new"))
    const input = screen.getByTestId("reporting-role-label")
    fireEvent.change(input, { target: { value: "  Project lead  " } })
    fireEvent.click(screen.getByTestId("reporting-role-save"))
    expect(createMutate).toHaveBeenCalledWith(
      { label: "Project lead" },
      expect.anything()
    )
  })

  it("does not submit a blank label", () => {
    render(<ReportingRolesConfigSection />)
    fireEvent.click(screen.getByTestId("reporting-role-new"))
    fireEvent.click(screen.getByTestId("reporting-role-save"))
    expect(createMutate).not.toHaveBeenCalled()
    expect(screen.getByText("Label is required.")).toBeInTheDocument()
  })

  it("deactivates an active role via the toggle", () => {
    render(<ReportingRolesConfigSection />)
    const activeRow = screen.getAllByTestId("reporting-role-row")[0]!
    fireEvent.click(within(activeRow).getByTestId("reporting-role-toggle"))
    expect(updateMutate).toHaveBeenCalledWith(
      { id: 1, body: { active: false } },
      expect.anything()
    )
  })

  it("activates an inactive role via the toggle", () => {
    render(<ReportingRolesConfigSection />)
    const inactiveRow = screen.getAllByTestId("reporting-role-row")[1]!
    fireEvent.click(within(inactiveRow).getByTestId("reporting-role-toggle"))
    expect(updateMutate).toHaveBeenCalledWith(
      { id: 2, body: { active: true } },
      expect.anything()
    )
  })
})
