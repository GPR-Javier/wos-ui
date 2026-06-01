import { api } from "./api"

export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ASSESSMENT"
  | "SHORTLISTED"
  | "OFFER"
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
}

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ASSESSMENT: "Assessment",
  SHORTLISTED: "Shortlisted",
  OFFER: "Offer",
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
  HIRED: "green",
  REJECTED: "red",
  WITHDRAWN: "gray",
}

export const applicationApi = {
  /** The signed-in applicant's own applications, newest first. */
  mine: () =>
    api.get<JobApplication[]>("/hr/applications/mine").then((r) => r.data),
  withdraw: (id: number) =>
    api
      .post<JobApplication>(`/hr/applications/${id}/withdraw`)
      .then((r) => r.data),
}
