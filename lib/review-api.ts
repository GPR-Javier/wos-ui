import { api } from "./api"
import type { ApplicationStatus } from "./application-api"

export interface ReviewListItem {
  id: number
  jobPostingId: number
  jobTitle: string | null
  department: string | null
  applicantName: string | null
  applicantEmail: string
  resumeFileName: string | null
  status: ApplicationStatus
  appliedAt: string
  assessmentCompleted: boolean
  basicScore: number | null
  interviewSubmitted: boolean
  interviewScore: number | null
  coverLetterScore: number | null
  resumeScore: number | null
  overall: number | null
}

export interface ReviewInterviewAnswer {
  question: string
  answer: string
  aiScore: number | null
  aiFeedback: string | null
  aiImprovements: string | null
}

export interface ReviewDetail {
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
  coverLetterScore: number | null
  coverLetterFeedback: string | null
  coverLetterImprovements: string | null
  hasResumeText: boolean
  resumeText: string | null
  resumeScore: number | null
  resumeFeedback: string | null
  resumeImprovements: string | null
  hasAssessment: boolean
  assessmentCompleted: boolean
  basicScore: number | null
  basicPassed: boolean | null
  traitScores: Record<string, number> | null
  interviewAnswers: ReviewInterviewAnswer[] | null
  aiScore: number | null
  aiGraded: boolean
}

export const reviewApi = {
  list: (status?: ApplicationStatus) =>
    api
      .get<ReviewListItem[]>("/hr/review/applications", {
        params: status ? { status } : {},
      })
      .then((r) => r.data),
  detail: (id: number) =>
    api.get<ReviewDetail>(`/hr/review/applications/${id}`).then((r) => r.data),
  setStatus: (id: number, status: ApplicationStatus, note?: string) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/status`, { status, note })
      .then((r) => r.data),
  grade: (id: number) =>
    api.post<ReviewDetail>(`/hr/review/applications/${id}/grade`).then((r) => r.data),
  reviewCoverLetter: (id: number) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/cover-letter-review`)
      .then((r) => r.data),
  reviewResume: (id: number) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/resume-review`)
      .then((r) => r.data),
  saveResumeText: (id: number, text: string) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/resume-text`, { text })
      .then((r) => r.data),
}
