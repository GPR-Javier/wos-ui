import { api } from "./api"
import type { PageResponse } from "./admin-api"

export type CoePurpose =
  | "EMPLOYMENT_REQUIREMENT"
  | "VISA_APPLICATION"
  | "BANK_LOAN"
  | "TRAVEL"
  | "GOVERNMENT_REQUIREMENT"
  | "SCHOOL_REQUIREMENT"
  | "PERSONAL_USE"
  | "OTHER"

export type CoeEmploymentStatus = "CURRENT_EMPLOYEE" | "FORMER_EMPLOYEE"

export type CoeCertificateType =
  | "BASIC_COE"
  | "COE_WITH_SALARY"
  | "COE_WITH_POSITION"
  | "COE_WITH_COMPENSATION_DETAILS"

export type CoeReleaseMethod = "DOWNLOAD_PDF" | "EMAIL_COPY" | "PRINTED_COPY"

export type CoeStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "RELEASED"
  | "COMPLETED"

export interface CoeRequest {
  id: number
  userId: number
  userName: string
  userEmail: string
  referenceNumber: string | null
  purpose: CoePurpose
  employmentStatus: CoeEmploymentStatus
  certificateType: CoeCertificateType
  recipientName: string | null
  additionalNotes: string | null
  releaseMethod: CoeReleaseMethod
  status: CoeStatus
  remarks: string | null
  approvedBy: number | null
  approvedByName: string | null
  approvedAt: string | null
  releasedAt: string | null
  documentUrl: string | null
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateCoePayload {
  purpose: CoePurpose
  employmentStatus: CoeEmploymentStatus
  certificateType: CoeCertificateType
  recipientName?: string
  additionalNotes?: string
  releaseMethod: CoeReleaseMethod
  isDraft?: boolean
}

export const coeApi = {
  // Employee
  createMine: (body: CreateCoePayload) =>
    api.post<CoeRequest>("/hr/coe-requests", body).then((r) => r.data),

  listMine: (
    params: { status?: CoeStatus; page?: number; size?: number } = {}
  ) =>
    api
      .get<PageResponse<CoeRequest>>("/hr/coe-requests/me", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  cancelMine: (id: number) =>
    api.post<CoeRequest>(`/hr/coe-requests/${id}/cancel`).then((r) => r.data),

  /** Generated COE PDF (available once approved). Returns a Blob. */
  downloadDocument: (id: number) =>
    api
      .get(`/hr/coe-requests/${id}/document`, { responseType: "blob" })
      .then((r) => r.data as Blob),

  // Admin / HR
  listAll: (
    params: {
      status?: CoeStatus
      search?: string
      page?: number
      size?: number
    } = {}
  ) =>
    api
      .get<PageResponse<CoeRequest>>("/hr/coe-requests", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  approve: (id: number, remarks?: string | null, signature?: string | null) =>
    api
      .post<CoeRequest>(`/hr/coe-requests/${id}/approve`, {
        remarks: remarks ?? null,
        signature: signature ?? null,
      })
      .then((r) => r.data),

  /** The signed-in reviewer's stored e-signature (null if none). */
  mySignature: () =>
    api
      .get<{ signature: string | null }>("/hr/coe-requests/my-signature")
      .then((r) => r.data.signature),

  reject: (id: number, remarks?: string | null) =>
    api
      .post<CoeRequest>(`/hr/coe-requests/${id}/reject`, {
        remarks: remarks ?? null,
      })
      .then((r) => r.data),

  markUnderReview: (id: number, remarks?: string | null) =>
    api
      .post<CoeRequest>(`/hr/coe-requests/${id}/review`, {
        remarks: remarks ?? null,
      })
      .then((r) => r.data),

  release: (id: number, documentUrl?: string | null) =>
    api
      .post<CoeRequest>(`/hr/coe-requests/${id}/release`, {
        documentUrl: documentUrl ?? null,
      })
      .then((r) => r.data),
}

/** Status values for which a generated COE PDF can be downloaded. */
export const COE_DOWNLOADABLE: CoeStatus[] = [
  "APPROVED",
  "RELEASED",
  "COMPLETED",
]

/** Trigger a browser download of a fetched blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── Display helpers ────────────────────────────────────────────────────────

export const COE_PURPOSE_LABEL: Record<CoePurpose, string> = {
  EMPLOYMENT_REQUIREMENT: "Employment Requirement",
  VISA_APPLICATION: "Visa Application",
  BANK_LOAN: "Bank Loan",
  TRAVEL: "Travel",
  GOVERNMENT_REQUIREMENT: "Government Requirement",
  SCHOOL_REQUIREMENT: "School Requirement",
  PERSONAL_USE: "Personal Use",
  OTHER: "Other",
}

export const COE_PURPOSE_COLOR: Record<
  CoePurpose,
  "blue" | "purple" | "green" | "amber" | "red" | "cyan" | "gray"
> = {
  EMPLOYMENT_REQUIREMENT: "blue",
  VISA_APPLICATION: "purple",
  BANK_LOAN: "green",
  TRAVEL: "cyan",
  GOVERNMENT_REQUIREMENT: "amber",
  SCHOOL_REQUIREMENT: "blue",
  PERSONAL_USE: "gray",
  OTHER: "gray",
}

export const COE_CERT_TYPE_LABEL: Record<CoeCertificateType, string> = {
  BASIC_COE: "Basic COE",
  COE_WITH_SALARY: "COE with Salary",
  COE_WITH_POSITION: "COE with Position",
  COE_WITH_COMPENSATION_DETAILS: "COE with Compensation",
}

export const COE_CERT_TYPE_DESC: Record<CoeCertificateType, string> = {
  BASIC_COE: "Standard employment verification",
  COE_WITH_SALARY: "Includes current salary details",
  COE_WITH_POSITION: "Includes position / designation",
  COE_WITH_COMPENSATION_DETAILS: "Full compensation package details",
}

export const COE_CERT_TYPE_COLOR: Record<
  CoeCertificateType,
  "gray" | "green" | "blue" | "purple"
> = {
  BASIC_COE: "gray",
  COE_WITH_SALARY: "green",
  COE_WITH_POSITION: "blue",
  COE_WITH_COMPENSATION_DETAILS: "purple",
}

export const COE_RELEASE_METHOD_LABEL: Record<CoeReleaseMethod, string> = {
  DOWNLOAD_PDF: "Download PDF",
  EMAIL_COPY: "Email Copy",
  PRINTED_COPY: "Printed Copy",
}

export const COE_RELEASE_METHOD_DESC: Record<CoeReleaseMethod, string> = {
  DOWNLOAD_PDF: "Receive a downloadable PDF link",
  EMAIL_COPY: "Sent to your registered email",
  PRINTED_COPY: "Pick up a printed copy from HR",
}

export const COE_PURPOSES: CoePurpose[] = [
  "EMPLOYMENT_REQUIREMENT",
  "VISA_APPLICATION",
  "BANK_LOAN",
  "TRAVEL",
  "GOVERNMENT_REQUIREMENT",
  "SCHOOL_REQUIREMENT",
  "PERSONAL_USE",
  "OTHER",
]

export const COE_CERT_TYPES: CoeCertificateType[] = [
  "BASIC_COE",
  "COE_WITH_SALARY",
  "COE_WITH_POSITION",
  "COE_WITH_COMPENSATION_DETAILS",
]

export const COE_RELEASE_METHODS: CoeReleaseMethod[] = [
  "DOWNLOAD_PDF",
  "EMAIL_COPY",
  "PRINTED_COPY",
]
