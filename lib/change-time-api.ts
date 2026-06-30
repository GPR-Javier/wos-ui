import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type ChangeTimeRequestType = "TIME_IN" | "TIME_OUT" | "BOTH"

export type ChangeTimeStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "CANCELLED"

export interface ChangeTimeRequest {
  id: number
  userId: number
  userName: string
  userEmail: string
  attendanceDate: string
  requestType: ChangeTimeRequestType
  currentTimeIn: string | null
  currentTimeOut: string | null
  requestedTimeIn: string | null
  requestedTimeOut: string | null
  reason: string
  status: ChangeTimeStatus
  reviewNote: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateChangeTimePayload {
  attendanceDate: string
  requestType: ChangeTimeRequestType
  currentTimeIn?: string | null
  currentTimeOut?: string | null
  requestedTimeIn?: string | null
  requestedTimeOut?: string | null
  reason: string
  isDraft?: boolean
}

export interface ReviewChangeTimePayload {
  reviewNote?: string | null
}

export const changeTimeApi = {
  // Employee
  createMine: (body: CreateChangeTimePayload) =>
    api
      .post<ChangeTimeRequest>("/hr/change-time-requests", body)
      .then((r) => r.data),

  listMine: (
    params: {
      status?: ChangeTimeStatus
      from?: string
      to?: string
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<ChangeTimeRequest>>("/hr/change-time-requests/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  updateMine: (id: number, body: CreateChangeTimePayload) =>
    api
      .put<ChangeTimeRequest>(`/hr/change-time-requests/${id}`, body)
      .then((r) => r.data),

  deleteMine: (id: number) =>
    api.delete<void>(`/hr/change-time-requests/${id}`).then((r) => r.data),

  submitDraft: (id: number) =>
    api
      .post<ChangeTimeRequest>(`/hr/change-time-requests/${id}/submit`)
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api
      .post<ChangeTimeRequest>(`/hr/change-time-requests/${id}/cancel`)
      .then((r) => r.data),

  // Admin
  listAll: (
    params: {
      status?: ChangeTimeStatus
      search?: string
      from?: string
      to?: string
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<ChangeTimeRequest>>("/hr/change-time-requests", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string | null) =>
    api
      .post<ChangeTimeRequest>(`/hr/change-time-requests/${id}/approve`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string | null) =>
    api
      .post<ChangeTimeRequest>(`/hr/change-time-requests/${id}/reject`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  returnForRevision: (id: number, reviewNote: string) =>
    api
      .post<ChangeTimeRequest>(`/hr/change-time-requests/${id}/return`, {
        reviewNote,
      })
      .then((r) => r.data),
}
