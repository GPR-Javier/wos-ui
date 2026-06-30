import { api } from "./api"
import type { PageResponse } from "./admin-api"

/** Discriminator for the unified employee request feed. */
export type RequestKind = "LEAVE" | "COE" | "OVERTIME" | "CHANGE_TIME"

/** Normalized status grouping the feed filters + colour-codes on. */
export type RequestBucket = "APPROVED" | "PENDING" | "DECLINED" | "NEUTRAL"

/**
 * One row of the unified feed. A flat union across the four request types — only the source fields
 * relevant to `type` are populated; the frontend composes the display using its own label maps.
 */
export interface RequestSummary {
  type: RequestKind
  id: number
  /** Raw per-type status enum. */
  status: string
  bucket: RequestBucket
  /** ISO datetime filed (createdAt / filedAt). */
  filedAt: string
  reason: string | null
  remarks: string | null
  // LEAVE
  leaveType: string | null
  startDate: string | null
  endDate: string | null
  days: number | null
  // COE
  purpose: string | null
  certificateType: string | null
  // OVERTIME
  overtimeType: string | null
  overtimeDate: string | null
  hours: number | null
  // CHANGE_TIME
  requestType: string | null
  attendanceDate: string | null
}

export interface RequestFeedParams {
  type?: RequestKind
  status?: RequestBucket
  /** ISO date (yyyy-MM-dd), inclusive. */
  from?: string
  to?: string
  page?: number
  size?: number
}

export const requestsApi = {
  listMine: (params: RequestFeedParams = {}) =>
    api
      .get<PageResponse<RequestSummary>>("/hr/requests/me", {
        params: { page: 0, size: 10, ...params },
      })
      .then((r) => r.data),
}
