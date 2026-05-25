import { api } from "./axios"
import type { PageResponse } from "./admin-api"

export type DisputeCategory =
  | "MISSING_SALARY"
  | "INCORRECT_AMOUNT"
  | "MISSING_OVERTIME"
  | "MISSING_ALLOWANCE"
  | "WRONG_DEDUCTION"
  | "TAX_ISSUE"
  | "ATTENDANCE_DISCREPANCY"
  | "HOLIDAY_PAY_ISSUE"
  | "OTHER"

export type DisputeStatus =
  | "DRAFT"
  | "PENDING"
  | "UNDER_REVIEW"
  | "PENDING_DOCUMENTS"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED"

export interface SalaryDispute {
  id: number
  userId: number
  userName: string
  userEmail: string
  payrollPeriod: string          // e.g. "May 1-15, 2025"
  salaryReleaseDate: string      // ISO date
  disputeCategory: DisputeCategory
  expectedAmount: number
  receivedAmount: number
  discrepancyAmount: number      // computed: expectedAmount - receivedAmount
  reason: string
  status: DisputeStatus
  resolutionNotes: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateDisputePayload {
  payrollPeriod: string
  salaryReleaseDate: string
  disputeCategory: DisputeCategory
  expectedAmount: number
  receivedAmount: number
  reason: string
  isDraft?: boolean
}

export interface ReviewDisputePayload {
  resolutionNotes?: string | null
}

export const salaryDisputeApi = {
  // Employee
  createMine: (body: CreateDisputePayload) =>
    api
      .post<SalaryDispute>("/salary-disputes", body)
      .then((r) => r.data),

  listMine: (
    params: { status?: DisputeStatus; page?: number; size?: number } = {}
  ) =>
    api
      .get<PageResponse<SalaryDispute>>("/salary-disputes/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api
      .post<SalaryDispute>(`/salary-disputes/${id}/cancel`)
      .then((r) => r.data),

  // Admin / Payroll
  listAll: (
    params: {
      status?: DisputeStatus
      search?: string
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<SalaryDispute>>("/salary-disputes", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  markUnderReview: (id: number, resolutionNotes?: string | null) =>
    api
      .post<SalaryDispute>(`/salary-disputes/${id}/review`, {
        resolutionNotes: resolutionNotes ?? null,
      })
      .then((r) => r.data),

  requestDocuments: (id: number, resolutionNotes: string) =>
    api
      .post<SalaryDispute>(`/salary-disputes/${id}/request-documents`, {
        resolutionNotes,
      })
      .then((r) => r.data),

  approve: (id: number, resolutionNotes?: string | null) =>
    api
      .post<SalaryDispute>(`/salary-disputes/${id}/approve`, {
        resolutionNotes: resolutionNotes ?? null,
      })
      .then((r) => r.data),

  reject: (id: number, resolutionNotes?: string | null) =>
    api
      .post<SalaryDispute>(`/salary-disputes/${id}/reject`, {
        resolutionNotes: resolutionNotes ?? null,
      })
      .then((r) => r.data),

  close: (id: number, resolutionNotes?: string | null) =>
    api
      .post<SalaryDispute>(`/salary-disputes/${id}/close`, {
        resolutionNotes: resolutionNotes ?? null,
      })
      .then((r) => r.data),
}

// ── Display helpers ────────────────────────────────────────────────────────

export const DISPUTE_CATEGORY_LABEL: Record<DisputeCategory, string> = {
  MISSING_SALARY: "Missing Salary",
  INCORRECT_AMOUNT: "Incorrect Amount",
  MISSING_OVERTIME: "Missing Overtime Pay",
  MISSING_ALLOWANCE: "Missing Allowance",
  WRONG_DEDUCTION: "Wrong Deduction",
  TAX_ISSUE: "Tax Issue",
  ATTENDANCE_DISCREPANCY: "Attendance Discrepancy",
  HOLIDAY_PAY_ISSUE: "Holiday Pay Issue",
  OTHER: "Other",
}

export const DISPUTE_CATEGORY_COLOR: Record<
  DisputeCategory,
  "red" | "amber" | "blue" | "purple" | "green" | "gray" | "cyan"
> = {
  MISSING_SALARY: "red",
  INCORRECT_AMOUNT: "red",
  MISSING_OVERTIME: "amber",
  MISSING_ALLOWANCE: "amber",
  WRONG_DEDUCTION: "purple",
  TAX_ISSUE: "blue",
  ATTENDANCE_DISCREPANCY: "cyan",
  HOLIDAY_PAY_ISSUE: "green",
  OTHER: "gray",
}

export const DISPUTE_CATEGORIES: DisputeCategory[] = [
  "MISSING_SALARY",
  "INCORRECT_AMOUNT",
  "MISSING_OVERTIME",
  "MISSING_ALLOWANCE",
  "WRONG_DEDUCTION",
  "TAX_ISSUE",
  "ATTENDANCE_DISCREPANCY",
  "HOLIDAY_PAY_ISSUE",
  "OTHER",
]
