import { api } from "./api"

// ── Types ─────────────────────────────────────────────────────────────────────
// All ids are identity userIds (the same id /hr/employees exposes).

/**
 * A person on the chart. NOTE: `managerId` was removed — reporting lines are now a
 * typed many-to-many, so a person's parents come from the graph's `edges`, not the node.
 */
export interface OrgNode {
  id: number
  name: string
  title: string
  departmentId: number | null
  department: string | null // resolved name (display/fallback)
}

/** A single "reports-to" line in the org graph (userId reports to managerId, with a typed role). */
export interface OrgEdge {
  id: number
  userId: number
  managerId: number
  reportingRoleId: number
  roleLabel: string
}

export interface OrgGraphResponse {
  nodes: OrgNode[]
  edges: OrgEdge[]
}

/** A reporting line as returned by the per-person reports-to endpoint (carries manager name). */
export interface ReportingLineDTO {
  id: number
  userId: number
  managerId: number
  managerName: string
  reportingRoleId: number
  roleLabel: string
}

export interface AddReportingLineRequest {
  managerId: number
  reportingRoleId: number
}

export interface OrgPosition {
  userId: number
  x: number
  y: number
}

export interface OrgDeptBox {
  departmentId: number
  x: number
  y: number
  w: number
  h: number
}

export interface OrgLayout {
  grouped: boolean
  nodes: OrgPosition[]
  boxes: OrgDeptBox[]
}

// ── API ───────────────────────────────────────────────────────────────────────

export const orgChartApi = {
  graph: () => api.get<OrgGraphResponse>("/hr/org-chart").then((r) => r.data),

  // Typed many-to-many reporting lines.
  reportsTo: (userId: number) =>
    api
      .get<ReportingLineDTO[]>(`/hr/org-chart/${userId}/reports-to`)
      .then((r) => r.data),

  addReportsTo: (userId: number, body: AddReportingLineRequest) =>
    api
      .post<ReportingLineDTO>(`/hr/org-chart/${userId}/reports-to`, body)
      .then((r) => r.data),

  removeReportsTo: (userId: number, lineId: number) =>
    api
      .delete(`/hr/org-chart/${userId}/reports-to/${lineId}`)
      .then((r) => r.data),

  // Legacy single-parent setter — kept for the "wire a new hire" flow in the
  // Create-user modal. New code should use addReportsTo instead.
  setManager: (userId: number, managerId: number | null) =>
    api.patch(`/hr/org-chart/${userId}/manager`, { managerId }),

  setDepartment: (userId: number, departmentId: number | null) =>
    api.patch(`/hr/org-chart/${userId}/department`, { departmentId }),

  getLayout: () =>
    api.get<OrgLayout>("/hr/org-chart/layout").then((r) => r.data),

  saveLayout: (layout: OrgLayout) =>
    api.put<OrgLayout>("/hr/org-chart/layout", layout).then((r) => r.data),

  resetLayout: () => api.delete("/hr/org-chart/layout"),
}
