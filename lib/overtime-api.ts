import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type OvertimeType =
  | "REGULAR"
  | "REST_DAY"
  | "REST_DAY_OT"
  | "HOLIDAY"
  | "EMERGENCY"

export type OvertimeStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"

export interface OvertimeRequest {
  id: number
  userId: number
  userName: string
  userEmail: string
  overtimeDate: string // ISO date "YYYY-MM-DD"
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  totalHours: number // computed decimal hours
  overtimeType: OvertimeType
  reason: string
  status: OvertimeStatus
  reviewNote: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateOvertimePayload {
  overtimeDate: string
  /** Overtime range — regular-day OT, or the rest-day overtime portion. */
  startTime?: string | null
  endTime?: string | null
  /** Rest-day duty range — only on rest days. */
  restStartTime?: string | null
  restEndTime?: string | null
  totalHours?: number
  /** Ignored on write — the server determines the type(s) from the schedule + ranges. */
  overtimeType?: OvertimeType
  reason: string
  isDraft?: boolean
}

export const overtimeApi = {
  // Employee
  createMine: (body: CreateOvertimePayload) =>
    api
      .post<OvertimeRequest>("/hr/overtime-requests", body)
      .then((r) => r.data),

  listMine: (
    params: { status?: OvertimeStatus; page?: number; size?: number } = {}
  ) =>
    api
      .get<PageResponse<OvertimeRequest>>("/hr/overtime-requests/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  submitDraft: (id: number) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/submit`)
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/cancel`)
      .then((r) => r.data),

  // Admin / HR
  listAll: (
    params: {
      status?: OvertimeStatus
      search?: string
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<OvertimeRequest>>("/hr/overtime-requests", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string | null) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/approve`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string | null) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/reject`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const OT_TYPE_LABEL: Record<OvertimeType, string> = {
  REGULAR: "Regular OT",
  REST_DAY: "Rest Day",
  REST_DAY_OT: "Rest Day OT",
  HOLIDAY: "Holiday OT",
  EMERGENCY: "Emergency OT",
}

/** Philippine labor code multipliers */
export const OT_RATE_MULTIPLIER: Record<OvertimeType, number> = {
  REGULAR: 1.25,
  REST_DAY: 1.3,
  REST_DAY_OT: 1.69, // rest-day work beyond the standard hours (1.30 × 1.30)
  HOLIDAY: 1.5,
  EMERGENCY: 1.25,
}

export const OT_TYPE_COLOR: Record<
  OvertimeType,
  "blue" | "amber" | "red" | "purple"
> = {
  REGULAR: "blue",
  REST_DAY: "amber",
  REST_DAY_OT: "red",
  HOLIDAY: "red",
  EMERGENCY: "purple",
}

/** Compute decimal hours between two "HH:mm" strings */
export function calcHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin < startMin) endMin += 24 * 60 // past midnight
  return Math.max(0, (endMin - startMin) / 60)
}
