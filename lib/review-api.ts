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
  /** Optional human reviewer note for this question. */
  reviewerComment: string | null
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
  rejectionReason: string | null
  rejectedAt: string | null
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
  // Human review of the AI interview (per-question comments live on interviewAnswers)
  reviewedBy: string | null
  reviewedAt: string | null
  reviewed: boolean
}

export interface ReviewPayload {
  /** Per-question comments, aligned by index to interviewAnswers. Blank = not reviewed. */
  reviewerComments: string[]
}

// AI (Ollama) endpoints far exceed the default 15s axios timeout — without these overrides the
// browser aborts the request mid-flight ("(canceled)"). Grade loops over every question, so it gets
// the most headroom; the single-shot helpers a generous cap.
const AI_TIMEOUT = 120_000
const AI_GRADE_TIMEOUT = 300_000

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
      .post<ReviewDetail>(`/hr/review/applications/${id}/status`, {
        status,
        note,
      })
      .then((r) => r.data),
  grade: (id: number) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/grade`, undefined, {
        timeout: AI_GRADE_TIMEOUT,
      })
      .then((r) => r.data),
  /** Save the human reviewer's per-question comments for the AI interview. */
  saveReview: (id: number, payload: ReviewPayload) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/review`, payload)
      .then((r) => r.data),
  /** AI-polish a single per-question reviewer comment; returns the improved text. */
  enhanceComment: (id: number, text: string, question: string) =>
    api
      .post<{
        text: string
      }>(
        `/hr/review/applications/${id}/review/enhance-comment`,
        { text, question },
        { timeout: AI_TIMEOUT }
      )
      .then((r) => r.data.text),
  reviewCoverLetter: (id: number) =>
    api
      .post<ReviewDetail>(
        `/hr/review/applications/${id}/cover-letter-review`,
        undefined,
        { timeout: AI_TIMEOUT }
      )
      .then((r) => r.data),
  reviewResume: (id: number) =>
    api
      .post<ReviewDetail>(
        `/hr/review/applications/${id}/resume-review`,
        undefined,
        { timeout: AI_TIMEOUT }
      )
      .then((r) => r.data),
  saveResumeText: (id: number, text: string) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/resume-text`, { text })
      .then((r) => r.data),
  /** AI draft ("suggest", when text is empty) or polish ("enhance") of a rejection note. */
  suggestRejection: (id: number, text?: string) =>
    api
      .post<{
        reason: string
      }>(
        `/hr/review/applications/${id}/rejection-suggestion`,
        { text },
        { timeout: AI_TIMEOUT }
      )
      .then((r) => r.data.reason),
}
