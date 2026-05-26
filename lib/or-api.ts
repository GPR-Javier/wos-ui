import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type OfficialReceiptStatus = "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED"

export type OfficialReceiptCategory =
  | "TRANSPORTATION"
  | "MEALS"
  | "ACCOMMODATION"
  | "OFFICE_SUPPLIES"
  | "COMMUNICATION"
  | "TRAINING"
  | "ENTERTAINMENT"
  | "MEDICAL"
  | "UTILITIES"
  | "OTHER"

export interface OfficialReceipt {
  id: number
  orNumber: string
  userId: number
  userName: string
  userEmail: string
  purpose: string
  amount: number
  receiptDate: string         // "YYYY-MM-DD"
  category: OfficialReceiptCategory
  vendorName: string | null
  description: string | null
  status: OfficialReceiptStatus
  reviewNote: string | null
  reviewedBy: number | null
  reviewedByName: string | null
  reviewedAt: string | null
  reimbursedAt: string | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrPayload {
  purpose: string
  amount: number
  receiptDate: string
  category: OfficialReceiptCategory
  vendorName?: string
  description?: string
}

export const orApi = {
  // Employee
  createMine: (body: CreateOrPayload, files?: File[]) => {
    if (files && files.length > 0) {
      const fd = new FormData()
      fd.append("purpose", body.purpose)
      fd.append("amount", String(body.amount))
      fd.append("receiptDate", body.receiptDate)
      fd.append("category", body.category)
      if (body.vendorName) fd.append("vendorName", body.vendorName)
      if (body.description) fd.append("description", body.description)
      files.forEach((f) => fd.append("attachments", f))
      return api
        .post<OfficialReceipt>("/hr/official-receipts", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data)
    }
    return api.post<OfficialReceipt>("/hr/official-receipts", body).then((r) => r.data)
  },

  listMine: (params: { status?: OfficialReceiptStatus; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<OfficialReceipt>>("/hr/official-receipts/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api.post<OfficialReceipt>(`/hr/official-receipts/${id}/cancel`).then((r) => r.data),

  // Admin / Finance
  listAll: (
    params: {
      status?: OfficialReceiptStatus
      search?: string
      category?: OfficialReceiptCategory
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<OfficialReceipt>>("/hr/official-receipts", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, reviewNote?: string | null) =>
    api
      .post<OfficialReceipt>(`/hr/official-receipts/${id}/approve`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),

  reject: (id: number, reviewNote?: string | null) =>
    api
      .post<OfficialReceipt>(`/hr/official-receipts/${id}/reject`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),

  markReimbursed: (id: number, reviewNote?: string | null) =>
    api
      .post<OfficialReceipt>(`/hr/official-receipts/${id}/reimburse`, { reviewNote: reviewNote ?? null })
      .then((r) => r.data),
}

// ── Display helpers ──────────────────────────────────────────────────────────

export const OR_CATEGORY_LABEL: Record<OfficialReceiptCategory, string> = {
  TRANSPORTATION: "Transportation",
  MEALS: "Meals & Food",
  ACCOMMODATION: "Accommodation",
  OFFICE_SUPPLIES: "Office Supplies",
  COMMUNICATION: "Communication",
  TRAINING: "Training / Conference",
  ENTERTAINMENT: "Entertainment",
  MEDICAL: "Medical",
  UTILITIES: "Utilities",
  OTHER: "Other",
}

export const OR_CATEGORY_COLOR: Record<
  OfficialReceiptCategory,
  "blue" | "amber" | "purple" | "gray" | "cyan" | "green" | "red"
> = {
  TRANSPORTATION: "blue",
  MEALS: "amber",
  ACCOMMODATION: "purple",
  OFFICE_SUPPLIES: "gray",
  COMMUNICATION: "cyan",
  TRAINING: "green",
  ENTERTAINMENT: "purple",
  MEDICAL: "red",
  UTILITIES: "cyan",
  OTHER: "gray",
}

export const OR_CATEGORIES: OfficialReceiptCategory[] = [
  "TRANSPORTATION",
  "MEALS",
  "ACCOMMODATION",
  "OFFICE_SUPPLIES",
  "COMMUNICATION",
  "TRAINING",
  "ENTERTAINMENT",
  "MEDICAL",
  "UTILITIES",
  "OTHER",
]

export function fmtPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
