import { api } from "./axios"
import type { PageResponse } from "./admin-api"

// ── Types mirroring the backend SchedulePolicyPayload ─────────────────────────

export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"

export interface SchedulePolicyPayload {
  earliestClockIn?: string // "HH:mm"
  latestClockIn?: string
  lateGraceMins?: number
  earliestClockOut?: string
  latestClockOut?: string
  requiredHours?: number
  undertimeGraceMins?: number
  workdays?: Weekday[]
  timezone?: string | null
}

export type PolicyScope = "ORG" | "USER_ROLE" | "USER"

export interface PolicyVersion {
  id: number
  scope: PolicyScope
  scopeRef: number | null
  scopeRefLabel: string
  payload: SchedulePolicyPayload
  /** True when this row marks removal of the override (tombstone). */
  deletionMarker: boolean
  createdBy: number | null
  createdByName: string | null
  note: string | null
  effectiveFrom: string // ISO date-time
  createdAt: string
}

export interface ResolvedPolicy {
  payload: SchedulePolicyPayload
  sourceScope: PolicyScope
  versionId: number | null
}

export interface SavePolicyRequest {
  scopeRef?: number | null
  payload: SchedulePolicyPayload
  note?: string | null
  effectiveFrom?: string | null
}

export const schedulePolicyApi = {
  getCurrent: (scope: PolicyScope, scopeRef?: number | null) =>
    api
      .get<PolicyVersion | "">("/schedule-policies/" + scope, {
        params: scopeRef != null ? { scopeRef } : {},
        // 204 → empty body. Axios returns "" — normalize to null below.
        validateStatus: (s) => s === 200 || s === 204,
      })
      .then((r) => (r.status === 204 || r.data === "" ? null : (r.data as PolicyVersion))),

  save: (scope: PolicyScope, body: SavePolicyRequest) =>
    api
      .post<PolicyVersion>("/schedule-policies/" + scope, body)
      .then((r) => r.data),

  history: (
    scope: PolicyScope,
    params: { scopeRef?: number | null; page?: number; size?: number } = {}
  ) =>
    api
      .get<PageResponse<PolicyVersion>>(`/schedule-policies/${scope}/history`, {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  resolveForUser: (userId: number) =>
    api
      .get<ResolvedPolicy>(`/schedule-policies/resolve/user/${userId}`)
      .then((r) => r.data),

  /** Current user's effective policy — drives the clock UI. */
  myPolicy: () =>
    api.get<SchedulePolicyPayload>("/attendance/me/policy").then((r) => r.data),

  /** All users/roles with a saved override at this scope — latest version per scopeRef. */
  listOverrides: (scope: PolicyScope) =>
    api
      .get<PolicyVersion[]>(`/schedule-policies/${scope}/overrides`)
      .then((r) => r.data),

  /**
   * Reset a scope. ORG → appends a built-in-defaults version. USER_ROLE / USER
   * → appends a tombstone marker so resolution falls through to the parent
   * scope while the audit trail is preserved.
   */
  reset: (scope: PolicyScope, scopeRef?: number | null) =>
    api
      .delete<void>(`/schedule-policies/${scope}`, {
        params: scopeRef != null ? { scopeRef } : {},
      })
      .then((r) => r.data),

  /** Employee self-service: my own USER-scope version history. */
  myHistory: (params: { page?: number; size?: number } = {}) =>
    api
      .get<{
        content: PolicyVersion[]
        totalElements: number
        totalPages: number
        size: number
        number: number
      }>("/schedule-policies/me/history", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),
}
