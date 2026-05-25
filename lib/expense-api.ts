import { api } from "./axios"
import type { PageResponse } from "./admin-api"

export type ExpenseCategory =
  | "TRANSPORTATION"
  | "ACCOMMODATION"
  | "MEALS"
  | "COMMUNICATION"
  | "OFFICE_SUPPLIES"
  | "TRAINING"
  | "ENTERTAINMENT"
  | "MEDICAL"
  | "OTHER"

export type ExpenseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "REIMBURSED"

export interface ExpenseReport {
  id: number
  userId: number
  userName: string
  userEmail: string
  title: string
  expenseDate: string       // "YYYY-MM-DD"
  category: ExpenseCategory
  amount: number
  description: string
  businessTripId: number | null
  status: ExpenseStatus
  reviewNote: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  reimbursedAt: string | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateExpensePayload {
  title: string
  expenseDate: string
  category: ExpenseCategory
  amount: number
  description: string
  businessTripId?: number
  isDraft?: boolean
}

export const expenseApi = {
  // Employee
  createMine: (body: CreateExpensePayload, files?: File[]) => {
    if (files && files.length > 0) {
      const fd = new FormData()
      fd.append("title", body.title)
      fd.append("expenseDate", body.expenseDate)
      fd.append("category", body.category)
      fd.append("amount", String(body.amount))
      fd.append("description", body.description)
      if (body.businessTripId != null) fd.append("businessTripId", String(body.businessTripId))
      if (body.isDraft != null) fd.append("isDraft", String(body.isDraft))
      files.forEach((f) => fd.append("attachments", f))
      return api
        .post<ExpenseReport>("/expense-reports", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data)
    }
    return api.post<ExpenseReport>("/expense-reports", body).then((r) => r.data)
  },

  listMine: (params: { status?: ExpenseStatus; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<ExpenseReport>>("/expense-reports/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api.post<ExpenseReport>(`/expense-reports/${id}/cancel`).then((r) => r.data),

  // Admin / Finance
  listAll: (
    params: {
      status?: ExpenseStatus
      search?: string
      category?: ExpenseCategory
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<ExpenseReport>>("/expense-reports", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string | null) =>
    api
      .post<ExpenseReport>(`/expense-reports/${id}/approve`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string | null) =>
    api
      .post<ExpenseReport>(`/expense-reports/${id}/reject`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),

  markReimbursed: (id: number, reviewNote?: string | null) =>
    api
      .post<ExpenseReport>(`/expense-reports/${id}/reimburse`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  TRANSPORTATION: "Transportation",
  ACCOMMODATION: "Accommodation",
  MEALS: "Meals & Food",
  COMMUNICATION: "Communication",
  OFFICE_SUPPLIES: "Office Supplies",
  TRAINING: "Training / Conference",
  ENTERTAINMENT: "Entertainment",
  MEDICAL: "Medical",
  OTHER: "Other",
}

export const EXPENSE_CATEGORY_COLOR: Record<
  ExpenseCategory,
  "blue" | "purple" | "amber" | "cyan" | "gray" | "green" | "red"
> = {
  TRANSPORTATION: "blue",
  ACCOMMODATION: "purple",
  MEALS: "amber",
  COMMUNICATION: "cyan",
  OFFICE_SUPPLIES: "gray",
  TRAINING: "green",
  ENTERTAINMENT: "purple",
  MEDICAL: "red",
  OTHER: "gray",
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "TRANSPORTATION",
  "ACCOMMODATION",
  "MEALS",
  "COMMUNICATION",
  "OFFICE_SUPPLIES",
  "TRAINING",
  "ENTERTAINMENT",
  "MEDICAL",
  "OTHER",
]

export function fmtPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
