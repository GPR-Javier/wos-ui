import { api } from "./api"
import type { SchedulePolicyPayload } from "./schedule-policy-api"
import type { LeaveCredits } from "./contract-api"

export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ASSESSMENT"
  | "SHORTLISTED"
  | "OFFER"
  | "OFFER_DECLINED"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"

export interface JobApplication {
  id: number
  jobPostingId: number
  jobTitle: string | null
  department: string | null
  applicantName: string | null
  applicantEmail: string
  applicantPhone: string | null
  message: string | null
  resumeFileName: string | null
  status: ApplicationStatus
  appliedAt: string
  updatedAt: string | null
  withdrawnAt: string | null
  /** Reviewer's reason for rejection — present when status is REJECTED. */
  rejectionReason: string | null
  rejectedAt: string | null
  /** When a rejected candidate may apply again. null = no cooldown / not rejected. */
  reapplyAvailableAt: string | null
}

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ASSESSMENT: "Assessment",
  SHORTLISTED: "Shortlisted",
  OFFER: "Offer",
  OFFER_DECLINED: "Offer declined",
  HIRED: "Hired",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
}

export const APPLICATION_STATUS_VARIANT: Record<
  ApplicationStatus,
  "green" | "amber" | "blue" | "red" | "gray"
> = {
  SUBMITTED: "blue",
  UNDER_REVIEW: "amber",
  ASSESSMENT: "blue",
  SHORTLISTED: "green",
  OFFER: "green",
  OFFER_DECLINED: "gray",
  HIRED: "green",
  REJECTED: "red",
  WITHDRAWN: "gray",
}

/** The offer/contract the applicant reviews and signs. */
export interface OfferView {
  applicationId: number
  contractId: number
  contractNumber: string | null
  contractStatus: string | null
  jobTitle: string | null
  applicantName: string | null
  userRoleId: number | null
  roleName: string | null
  jobPositionId: number | null
  jobPositionTitle: string | null
  department: string | null
  employmentType: string | null
  workType: string | null
  salaryGradeName: string | null
  salaryAmount: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  leaveCredits: LeaveCredits | null
  startDate: string | null
  probationEndDate: string | null
  notes: string | null
  signature: string | null
  signingDate: string | null
  scheduleOverridden: boolean
  schedulePolicy: SchedulePolicyPayload | null
}

export const applicationApi = {
  /** The signed-in applicant's own applications, newest first. */
  mine: () =>
    api.get<JobApplication[]>("/hr/applications/mine").then((r) => r.data),
  withdraw: (id: number) =>
    api
      .post<JobApplication>(`/hr/applications/${id}/withdraw`)
      .then((r) => r.data),
  /** The applicant's offer/contract for review and signing. */
  getOffer: (id: number) =>
    api.get<OfferView>(`/hr/applications/${id}/offer`).then((r) => r.data),
  /** Accept the offer with a drawn signature (base64 PNG data URL). Provisions the employee. */
  acceptOffer: (id: number, signature: string) =>
    api
      .post<OfferView>(`/hr/applications/${id}/offer/accept`, { signature })
      .then((r) => r.data),
  declineOffer: (id: number) =>
    api
      .post<JobApplication>(`/hr/applications/${id}/offer/decline`)
      .then((r) => r.data),
}
