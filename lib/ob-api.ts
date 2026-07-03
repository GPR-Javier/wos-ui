import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type ObDuration = "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM" | "CUSTOM"

export type ObStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "CANCELLED"

export interface ObRequest {
  id: number
  userId: number
  userName: string
  userEmail: string
  obDate: string
  duration: ObDuration
  customStartTime: string | null
  customEndTime: string | null
  purpose: string
  location: string
  notes: string | null
  status: ObStatus
  reviewNote: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateObPayload {
  obDate: string
  duration: ObDuration
  customStartTime?: string | null
  customEndTime?: string | null
  purpose: string
  location: string
  notes?: string | null
  isDraft?: boolean
}

export interface ReviewObPayload {
  reviewNote?: string | null
}

export const obApi = {
  // Employee
  createMine: (body: CreateObPayload) =>
    api.post<ObRequest>("/hr/ob-requests", body).then((r) => r.data),

  listMine: (
    params: {
      status?: ObStatus
      from?: string
      to?: string
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<ObRequest>>("/hr/ob-requests/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  updateMine: (id: number, body: CreateObPayload) =>
    api.put<ObRequest>(`/hr/ob-requests/${id}`, body).then((r) => r.data),

  deleteMine: (id: number) =>
    api.delete<void>(`/hr/ob-requests/${id}`).then((r) => r.data),

  submitDraft: (id: number) =>
    api.post<ObRequest>(`/hr/ob-requests/${id}/submit`).then((r) => r.data),

  cancelMine: (id: number) =>
    api.post<ObRequest>(`/hr/ob-requests/${id}/cancel`).then((r) => r.data),

  // Admin
  listAll: (
    params: {
      status?: ObStatus
      search?: string
      from?: string
      to?: string
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<ObRequest>>("/hr/ob-requests", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string | null) =>
    api
      .post<ObRequest>(`/hr/ob-requests/${id}/approve`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string | null) =>
    api
      .post<ObRequest>(`/hr/ob-requests/${id}/reject`, {
        reviewNote: reviewNote ?? null,
      })
      .then((r) => r.data),

  returnForRevision: (id: number, reviewNote: string) =>
    api
      .post<ObRequest>(`/hr/ob-requests/${id}/return`, {
        reviewNote,
      })
      .then((r) => r.data),
}
