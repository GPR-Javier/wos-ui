import { api } from "./api"

// ── Types ─────────────────────────────────────────────────────────────────────
// All ids are identity userIds (the same id /hr/employees exposes).

export interface OrgNode {
  id: number
  name: string
  title: string
  departmentId: number | null
  department: string | null // resolved name (display/fallback)
  managerId: number | null
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
  graph: () => api.get<OrgNode[]>("/hr/org-chart").then((r) => r.data),

  setManager: (userId: number, managerId: number | null) =>
    api.patch(`/hr/org-chart/${userId}/manager`, { managerId }),

  setDepartment: (userId: number, departmentId: number | null) =>
    api.patch(`/hr/org-chart/${userId}/department`, { departmentId }),

  getLayout: () => api.get<OrgLayout>("/hr/org-chart/layout").then((r) => r.data),

  saveLayout: (layout: OrgLayout) =>
    api.put<OrgLayout>("/hr/org-chart/layout", layout).then((r) => r.data),

  resetLayout: () => api.delete("/hr/org-chart/layout"),
}
