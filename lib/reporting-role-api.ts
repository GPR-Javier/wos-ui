import { api } from "./api"

// ── Types (match the backend contract 1:1) ──────────────────────────────────

export interface ReportingRoleDTO {
  id: number
  label: string
  active: boolean
}

export interface CreateReportingRoleRequest {
  label: string
}

export interface UpdateReportingRoleRequest {
  label?: string
  active?: boolean
}

// ── API ──────────────────────────────────────────────────────────────────────

export const reportingRoleApi = {
  /** Active roles only by default; pass includeInactive to list deactivated ones too. */
  list: (params: { includeInactive?: boolean } = {}) =>
    api
      .get<ReportingRoleDTO[]>("/hr/reporting-roles", { params })
      .then((r) => r.data),

  create: (body: CreateReportingRoleRequest) =>
    api.post<ReportingRoleDTO>("/hr/reporting-roles", body).then((r) => r.data),

  update: (id: number, body: UpdateReportingRoleRequest) =>
    api
      .put<ReportingRoleDTO>(`/hr/reporting-roles/${id}`, body)
      .then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/hr/reporting-roles/${id}`).then((r) => r.data),
}
