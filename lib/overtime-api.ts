import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type OvertimeType =
  | "REGULAR"
  | "REST_DAY"
  | "REST_DAY_OT"
  | "REGULAR_HOLIDAY"
  | "REGULAR_HOLIDAY_OT"
  | "REGULAR_HOLIDAY_REST_DAY"
  | "REGULAR_HOLIDAY_REST_DAY_OT"
  | "SPECIAL_HOLIDAY"
  | "SPECIAL_HOLIDAY_OT"
  | "SPECIAL_HOLIDAY_REST_DAY"
  | "SPECIAL_HOLIDAY_REST_DAY_OT"
  | "EMERGENCY"

export type OvertimeStatus =
  | "DRAFT"
  // Phase 1 — authorization (permission before the work)
  | "PENDING_AUTH"
  | "AUTHORIZED"
  | "AUTH_REJECTED"
  // Phase 2 — claim (actual hours after the work)
  | "PENDING_CLAIM"
  // Shared / terminal
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED"
  // Emergency (post-hoc, no prior authorization)
  | "PENDING_EMERGENCY_CLAIM"
  // Legacy single-phase
  | "PENDING"

export interface OvertimeRequest {
  id: number
  userId: number
  userName: string
  userEmail: string
  overtimeDate: string // ISO date "YYYY-MM-DD"
  // Phase 1 — the estimate
  plannedStartTime: string | null // "HH:mm"
  plannedEndTime: string | null // "HH:mm"
  plannedHours: number | null
  // Phase 2 — the actuals (null until the claim is filed)
  startTime: string | null // "HH:mm"
  endTime: string | null // "HH:mm"
  totalHours: number | null // computed decimal hours
  overtimeType: OvertimeType
  reason: string
  status: OvertimeStatus
  adminInitiated: boolean
  // Phase 1 reviewer (authorization)
  authorizedBy: number | null
  authorizedByName: string | null
  authorizedAt: string | null
  declineReason: string | null
  // Phase 2 reviewer (claim) + shared review note
  reviewNote: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

/** Phase 1 — employee files a pre-authorization (estimate) for a future/today date. */
export interface AuthorizeOvertimePayload {
  overtimeDate: string
  plannedStartTime: string // "HH:mm"
  plannedEndTime: string // "HH:mm"
  reason?: string
  isDraft?: boolean
}

/** Admin/manager bulk pre-authorization. */
export interface BulkAuthorizePayload {
  overtimeDate: string
  plannedStartTime: string
  plannedEndTime: string
  reason?: string
  userIds: number[]
}

/** Phase 2 — employee confirms the actual hours worked against an authorization. */
export interface ClaimOvertimePayload {
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  reason?: string
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
    params: {
      status?: OvertimeStatus
      from?: string
      to?: string
      page?: number
      size?: number
    } = {}
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

  // ── Phase 1: authorization (permission before the work) ──
  createAuthorization: (body: AuthorizeOvertimePayload) =>
    api
      .post<OvertimeRequest>("/hr/overtime-requests/authorizations", body)
      .then((r) => r.data),

  decline: (id: number, reason?: string | null) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/decline`, {
        reason: reason ?? null,
      })
      .then((r) => r.data),

  resubmit: (id: number) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/resubmit`)
      .then((r) => r.data),

  // ── Phase 2: claim (actual hours after the work) ──
  submitClaim: (id: number, body: ClaimOvertimePayload) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/claim`, body)
      .then((r) => r.data),

  // ── Emergency (post-hoc claim, no prior authorization) ──
  createEmergency: (body: CreateOvertimePayload) =>
    api
      .post<OvertimeRequest>("/hr/overtime-requests/emergency", body)
      .then((r) => r.data),

  // Admin / HR
  listAll: (
    params: {
      status?: OvertimeStatus
      search?: string
      from?: string
      to?: string
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

  // ── Phase 1 review (authorization) ──
  bulkAuthorize: (body: BulkAuthorizePayload) =>
    api
      .post<
        OvertimeRequest[]
      >("/hr/overtime-requests/authorizations/bulk", body)
      .then((r) => r.data),

  authorize: (id: number, reviewNote?: string | null) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/authorize`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  rejectAuthorization: (id: number, reviewNote?: string | null) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/authorize/reject`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  returnAuthorization: (id: number, reviewNote: string) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/authorize/return`, {
        reviewNote,
      })
      .then((r) => r.data),

  // ── Phase 2 review (claim) ──
  approveClaim: (id: number, reviewNote?: string | null) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/claim/approve`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  rejectClaim: (id: number, reviewNote?: string | null) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/claim/reject`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  returnClaim: (id: number, reviewNote: string) =>
    api
      .post<OvertimeRequest>(`/hr/overtime-requests/${id}/claim/return`, {
        reviewNote,
      })
      .then((r) => r.data),
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const OT_TYPE_LABEL: Record<OvertimeType, string> = {
  REGULAR: "Regular OT",
  REST_DAY: "Rest Day",
  REST_DAY_OT: "Rest Day OT",
  REGULAR_HOLIDAY: "Regular Holiday",
  REGULAR_HOLIDAY_OT: "Reg. Holiday OT",
  REGULAR_HOLIDAY_REST_DAY: "Reg. Holiday + RD",
  REGULAR_HOLIDAY_REST_DAY_OT: "Reg. Holiday + RD OT",
  SPECIAL_HOLIDAY: "Special Holiday",
  SPECIAL_HOLIDAY_OT: "Special Holiday OT",
  SPECIAL_HOLIDAY_REST_DAY: "Special Holiday + RD",
  SPECIAL_HOLIDAY_REST_DAY_OT: "Special Holiday + RD OT",
  EMERGENCY: "Emergency OT",
}

/**
 * Philippine labor-code statutory multipliers — the DEFAULTS. The effective rate is
 * company-configurable; use {@link useEffectiveOtRates} to read a company's values (these are the
 * fallback when a type hasn't been overridden).
 */
export const OT_RATE_MULTIPLIER: Record<OvertimeType, number> = {
  REGULAR: 1.25,
  REST_DAY: 1.3,
  REST_DAY_OT: 1.69, // rest-day work beyond the standard hours (1.30 × 1.30)
  REGULAR_HOLIDAY: 2.0,
  REGULAR_HOLIDAY_OT: 2.6, // overtime on a regular holiday (2.00 × 1.30)
  REGULAR_HOLIDAY_REST_DAY: 2.6, // regular holiday falling on a rest day (2.00 × 1.30)
  REGULAR_HOLIDAY_REST_DAY_OT: 3.38, // OT on a regular holiday + rest day (2.60 × 1.30)
  SPECIAL_HOLIDAY: 1.3,
  SPECIAL_HOLIDAY_OT: 1.69, // overtime on a special non-working day (1.30 × 1.30)
  SPECIAL_HOLIDAY_REST_DAY: 1.5, // special non-working day on a rest day
  SPECIAL_HOLIDAY_REST_DAY_OT: 1.95, // OT on a special day + rest day (1.50 × 1.30)
  EMERGENCY: 1.25,
}

export const OT_TYPE_COLOR: Record<
  OvertimeType,
  "blue" | "amber" | "red" | "purple"
> = {
  REGULAR: "blue",
  REST_DAY: "amber",
  REST_DAY_OT: "red",
  REGULAR_HOLIDAY: "purple",
  REGULAR_HOLIDAY_OT: "purple",
  REGULAR_HOLIDAY_REST_DAY: "purple",
  REGULAR_HOLIDAY_REST_DAY_OT: "purple",
  SPECIAL_HOLIDAY: "purple",
  SPECIAL_HOLIDAY_OT: "purple",
  SPECIAL_HOLIDAY_REST_DAY: "purple",
  SPECIAL_HOLIDAY_REST_DAY_OT: "purple",
  EMERGENCY: "purple",
}

export type OtStatusVariant = "amber" | "green" | "red" | "gray" | "blue"

export const OT_STATUS_LABEL: Record<OvertimeStatus, string> = {
  DRAFT: "Draft",
  PENDING_AUTH: "Pending authorization",
  AUTHORIZED: "Authorized",
  AUTH_REJECTED: "Not authorized",
  PENDING_CLAIM: "Claim under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Needs revision",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  PENDING_EMERGENCY_CLAIM: "Emergency — under review",
  PENDING: "Pending",
}

export const OT_STATUS_VARIANT: Record<OvertimeStatus, OtStatusVariant> = {
  DRAFT: "gray",
  PENDING_AUTH: "amber",
  AUTHORIZED: "blue",
  AUTH_REJECTED: "red",
  PENDING_CLAIM: "amber",
  APPROVED: "green",
  REJECTED: "red",
  RETURNED: "amber",
  DECLINED: "gray",
  EXPIRED: "gray",
  CANCELLED: "gray",
  PENDING_EMERGENCY_CLAIM: "amber",
  PENDING: "amber",
}

/** Which queue an admin acts on a request from. */
export type OtQueue = "authorization" | "claim" | "none"

export function otQueue(status: OvertimeStatus): OtQueue {
  if (status === "PENDING_AUTH") return "authorization"
  if (status === "PENDING_CLAIM" || status === "PENDING_EMERGENCY_CLAIM")
    return "claim"
  return "none"
}

/** True when the employee can file actual hours against this row (Phase 2). */
export function canSubmitClaim(status: OvertimeStatus): boolean {
  return status === "AUTHORIZED"
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
