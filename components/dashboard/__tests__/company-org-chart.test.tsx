import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {
  OrgGraphResponse,
  OrgLayout,
  ReportingLineDTO,
} from "@/lib/org-chart-api"
import type { ReportingRoleDTO } from "@/lib/reporting-role-api"

// ── A tiny org graph where one person reports to TWO managers (the matrix case) ──
const GRAPH: OrgGraphResponse = {
  nodes: [
    {
      id: 1,
      name: "Ada CEO",
      title: "CEO",
      departmentId: 10,
      department: "Exec",
    },
    {
      id: 2,
      name: "Bo VP",
      title: "VP Eng",
      departmentId: 20,
      department: "Eng",
    },
    {
      id: 3,
      name: "Cy PM",
      title: "PM",
      departmentId: 30,
      department: "Product",
    },
    {
      id: 4,
      name: "Di Dev",
      title: "Engineer",
      departmentId: 20,
      department: "Eng",
    },
  ],
  // Di (4) reports to BOTH Bo (2, direct) and Cy (3, dotted-line) — many parents.
  edges: [
    {
      id: 100,
      userId: 2,
      managerId: 1,
      reportingRoleId: 1,
      roleLabel: "Direct manager",
    },
    {
      id: 101,
      userId: 3,
      managerId: 1,
      reportingRoleId: 1,
      roleLabel: "Direct manager",
    },
    {
      id: 102,
      userId: 4,
      managerId: 2,
      reportingRoleId: 1,
      roleLabel: "Direct manager",
    },
    {
      id: 103,
      userId: 4,
      managerId: 3,
      reportingRoleId: 2,
      roleLabel: "Dotted-line",
    },
  ],
}

const LAYOUT: OrgLayout = { grouped: false, nodes: [], boxes: [] }
const ROLES: ReportingRoleDTO[] = [
  { id: 1, label: "Direct manager", active: true },
  { id: 2, label: "Dotted-line", active: true },
]
const LINES: ReportingLineDTO[] = []

// ── Lightweight React Flow stub — jsdom can't run the real canvas/ResizeObserver. ──
vi.mock("@xyflow/react", async () => {
  const R = await import("react")
  return {
    ReactFlow: ({
      nodes,
      edges,
      children,
    }: {
      nodes?: unknown[]
      edges?: unknown[]
      children?: React.ReactNode
    }) =>
      R.createElement(
        "div",
        {
          "data-testid": "react-flow",
          "data-node-count": nodes?.length ?? 0,
          "data-edge-count": edges?.length ?? 0,
        },
        children
      ),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
    Background: () => null,
    Controls: () => null,
    Panel: ({ children }: { children: React.ReactNode }) =>
      R.createElement("div", null, children),
    Handle: () => null,
    NodeResizer: () => null,
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    useNodesState: (init: unknown[]) => {
      const [s, set] = R.useState(init)
      return [s, set, vi.fn()]
    },
    useEdgesState: (init: unknown[]) => {
      const [s, set] = R.useState(init)
      return [s, set, vi.fn()]
    },
    useReactFlow: () => ({ getNodes: () => [] }),
  }
})

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }))

// Admin who can edit the company (unlocks the editable canvas paths).
vi.mock("@/store/auth-store", () => ({
  useAuthStore: (sel: (s: { authorities: string[] }) => unknown) =>
    sel({ authorities: ["CONFIGURATION:EDIT_COMPANY_DETAILS"] }),
}))
vi.mock("@/store/toast-store", () => ({
  useToastStore: (sel: (s: { push: () => void }) => unknown) =>
    sel({ push: vi.fn() }),
}))

vi.mock("@/hooks/use-org-chart", () => ({
  useOrgGraph: () => ({ data: GRAPH, isLoading: false }),
  useOrgLayout: () => ({ data: LAYOUT, isLoading: false }),
  useReportsTo: () => ({ data: LINES, isLoading: false }),
  useAddReportingLine: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveReportingLine: () => ({ mutate: vi.fn(), isPending: false }),
  useSetDepartment: () => ({ mutate: vi.fn(), isPending: false }),
  useSaveLayout: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock("@/hooks/use-reporting-roles", () => ({
  useReportingRoles: () => ({ data: ROLES, isLoading: false }),
}))
vi.mock("@/hooks/use-employee-profile", () => ({
  useDepartments: () => ({
    data: [
      { id: 10, name: "Exec", active: true },
      { id: 20, name: "Eng", active: true },
      { id: 30, name: "Product", active: true },
    ],
  }),
  useCreateDepartment: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock("@/hooks/use-admin-roles", () => ({
  useCreateUserRole: () => ({ mutate: vi.fn(), isPending: false }),
}))

// Keep the deep admin form modals out of the smoke test.
vi.mock("@/components/dashboard/admin/users", () => ({
  CreateUserModal: () => null,
}))
vi.mock("@/components/dashboard/admin/roles", () => ({
  RoleFormModal: () => null,
}))
vi.mock("@/components/dashboard/admin/departments", () => ({
  DepartmentFormModal: () => null,
}))

import { CompanyOrgChart } from "@/components/dashboard/company-org-chart"

function renderChart() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <CompanyOrgChart />
    </QueryClientProvider>
  )
}

describe("CompanyOrgChart (matrix)", () => {
  it("renders from an OrgGraphResponse with multiple edges without crashing", () => {
    renderChart()
    const flow = screen.getByTestId("react-flow")
    expect(flow).toBeInTheDocument()
    // 4 people rendered as nodes.
    expect(flow).toHaveAttribute("data-node-count", "4")
    // All 4 reporting lines (incl. the 2 parents of person 4) rendered as edges.
    expect(flow).toHaveAttribute("data-edge-count", "4")
  })
})
