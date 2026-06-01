import { api } from "./api"
import type { PageResponse } from "./admin-api"
import type { SchedulePolicyPayload } from "./schedule-policy-api"

export type ChangeRequestType =
  | "SHIFT_CHANGE"
  | "DAY_OFF"
  | "PERMANENT_POLICY_CHANGE"

export type ChangeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"

export interface ScheduleChangeRequest {
  id: number
  userId: number
  userName: string
  userEmail: string
  type: ChangeRequestType
  status: ChangeRequestStatus
  effectiveFrom: string // ISO date
  effectiveUntil: string | null
  requestedPayload: SchedulePolicyPayload
  reason: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewNote: string | null
  appliedVersionId: number | null
  createdAt: string
}

export interface CreateChangeRequestPayload {
  type: ChangeRequestType
  effectiveFrom: string // "YYYY-MM-DD"
  effectiveUntil?: string | null
  requestedPayload: SchedulePolicyPayload
  reason?: string | null
}

export const scheduleChangeRequestApi = {
  create: (body: CreateChangeRequestPayload) =>
    api
      .post<ScheduleChangeRequest>("/hr/schedule-change-requests", body)
      .then((r) => r.data),

  listMine: (params: { page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<ScheduleChangeRequest>>(
        "/hr/schedule-change-requests/me",
        {
          params: { page: 0, size: 20, ...params },
        }
      )
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api
      .post<ScheduleChangeRequest>(`/hr/schedule-change-requests/${id}/cancel`)
      .then((r) => r.data),

  listAll: (
    params: { status?: ChangeRequestStatus; page?: number; size?: number } = {}
  ) =>
    api
      .get<PageResponse<ScheduleChangeRequest>>(
        "/hr/schedule-change-requests",
        {
          params: { page: 0, size: 20, ...params },
        }
      )
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string) =>
    api
      .post<ScheduleChangeRequest>(
        `/hr/schedule-change-requests/${id}/approve`,
        {
          reviewNote: reviewNote ?? null,
        }
      )
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string) =>
    api
      .post<ScheduleChangeRequest>(
        `/hr/schedule-change-requests/${id}/reject`,
        {
          reviewNote: reviewNote ?? null,
        }
      )
      .then((r) => r.data),
}
