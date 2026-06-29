import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type LeaveType =
  | "VACATION"
  | "SICK"
  | "EMERGENCY"
  | "MATERNITY"
  | "PATERNITY"

export type LeaveStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "CANCELLED"

export type LeaveDuration = "FULL" | "HALF_AM" | "HALF_PM"

export interface LeaveRequest {
  id: number
  requestCode: string
  userId: number
  employeeName: string
  employeeId: string
  employeeEmail: string | null
  leaveType: LeaveType
  startDate: string // ISO date
  endDate: string // ISO date
  days: number
  /** Half-day overrides keyed by ISO date; absent dates are full days. */
  dayParts: Record<string, LeaveDuration>
  status: LeaveStatus
  reason: string | null
  filedAt: string
  reviewNote: string | null
  reviewedByName: string | null
  reviewedAt: string | null
}

export interface CreateLeavePayload {
  leaveType: LeaveType
  startDate: string
  endDate: string
  dayParts?: Record<string, LeaveDuration>
  reason?: string
  isDraft?: boolean
}

export const leaveApi = {
  // ── Employee ──
  createMine: (body: CreateLeavePayload) =>
    api.post<LeaveRequest>("/hr/leave-requests", body).then((r) => r.data),

  listMine: (
    params: { status?: LeaveStatus; page?: number; size?: number } = {}
  ) =>
    api
      .get<PageResponse<LeaveRequest>>("/hr/leave-requests/me", {
        params: { page: 0, size: 50, ...params },
      })
      .then((r) => r.data),

  update: (id: number, body: CreateLeavePayload) =>
    api.put<LeaveRequest>(`/hr/leave-requests/${id}`, body).then((r) => r.data),

  submitDraft: (id: number) =>
    api
      .post<LeaveRequest>(`/hr/leave-requests/${id}/submit`)
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api
      .post<LeaveRequest>(`/hr/leave-requests/${id}/cancel`)
      .then((r) => r.data),

  deleteMine: (id: number) =>
    api.delete(`/hr/leave-requests/${id}`).then((r) => r.data),

  // ── Admin / HR ──
  listAll: (params: { status?: string; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<LeaveRequest>>("/hr/leave-requests", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string | null) =>
    api
      .post<LeaveRequest>(`/hr/leave-requests/${id}/approve`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string | null) =>
    api
      .post<LeaveRequest>(`/hr/leave-requests/${id}/reject`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  returnForRevision: (id: number, reviewNote: string) =>
    api
      .post<LeaveRequest>(`/hr/leave-requests/${id}/return`, { reviewNote })
      .then((r) => r.data),
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  VACATION: "Vacation",
  SICK: "Sick",
  EMERGENCY: "Emergency",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
}

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Needs revision",
  CANCELLED: "Cancelled",
}

export const LEAVE_STATUS_VARIANT: Record<
  LeaveStatus,
  "amber" | "green" | "red" | "gray"
> = {
  DRAFT: "gray",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  RETURNED: "amber",
  CANCELLED: "gray",
}

export const LEAVE_DURATION_LABEL: Record<LeaveDuration, string> = {
  FULL: "Full day",
  HALF_AM: "Half day (AM)",
  HALF_PM: "Half day (PM)",
}

/** Inclusive list of ISO dates from start..end. */
export function enumerateDates(start: string, end: string): string[] {
  if (!start || !end) return []
  const out: string[] = []
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  if (e < s) return []
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    )
  }
  return out
}

/** Total leave days across a range minus 0.5 for each half-day override. */
export function leaveDays(
  start: string,
  end: string,
  dayParts: Record<string, LeaveDuration> = {}
): number {
  const dates = enumerateDates(start, end)
  let total = 0
  for (const d of dates)
    total += dayParts[d] && dayParts[d] !== "FULL" ? 0.5 : 1
  return total
}
