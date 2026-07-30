import { api } from "./api"

/**
 * Company-wide leave rules per type — the entitlement defaults that previously lived only on
 * individual employment contracts.
 *
 * A contract that specifies its own credits still wins; these supply the number when it doesn't.
 */

export type LeaveTypeCode =
  | "VACATION"
  | "SICK"
  | "EMERGENCY"
  | "MATERNITY"
  | "PATERNITY"

/**
 * - `UPFRONT` — the full annual entitlement is available immediately.
 * - `MONTHLY` — earned pro-rata per completed month of service.
 * - `NONE` — not credit-backed (statutory types are uncapped).
 */
export type LeaveAccrualMode = "UPFRONT" | "MONTHLY" | "NONE"

export interface LeavePolicy {
  leaveType: LeaveTypeCode
  enabled: boolean
  paid: boolean
  /** Annual days used when the employment contract doesn't specify its own. */
  defaultCredits: number | null
  accrualMode: LeaveAccrualMode
  /** Months of service before any entitlement is earned — the probation gate. */
  accrualStartsAfterMonths: number
}

export type UpdateLeavePolicyPayload = Omit<LeavePolicy, "leaveType">

/** Blast radius of changing a default: who currently inherits it, and from what. */
export interface LeavePolicyImpact {
  inheritingEmployees: number
  currentDefault: number | null
}

export const leavePolicyApi = {
  list: () => api.get<LeavePolicy[]>("/hr/leave/policies").then((r) => r.data),

  impact: (leaveType: LeaveTypeCode) =>
    api
      .get<LeavePolicyImpact>(`/hr/leave/policies/${leaveType}/impact`)
      .then((r) => r.data),

  update: (leaveType: LeaveTypeCode, payload: UpdateLeavePolicyPayload) =>
    api
      .put<LeavePolicy>(`/hr/leave/policies/${leaveType}`, payload)
      .then((r) => r.data),
}
