import { api } from "./api"
import type { ApplicationStatus, OfferView } from "./application-api"
import type { AssessmentPartType } from "./assessment-api"
import type { Pipeline } from "./pipeline-api"
import type { SchedulePolicyPayload } from "./schedule-policy-api"
import type { LeaveCredits } from "./contract-api"

export type { Pipeline } from "./pipeline-api"

export type ReviewDecision = "PENDING" | "PASSED" | "REJECTED"
export type StageStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "PASSED"
  | "REJECTED"
  | "SKIPPED"

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
  // Per-stage interview status: null = n/a, else PENDING | UNDER_REVIEW | PASSED | REJECTED | SKIPPED
  hrAiScore: number | null
  hrAiStatus: StageStatus | null
  technicalAiScore: number | null
  technicalAiStatus: StageStatus | null
  liveStatus: StageStatus | null
  finalStatus: StageStatus | null
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

/** One closing reverse-Q&A turn: a question the candidate asked us and the interviewer's reply. */
export interface ReviewCandidateQa {
  question: string
  answer: string
}

/** One AI interview stage (HR AI or Technical AI) in the review detail. */
export interface ReviewInterviewBlock {
  partType: AssessmentPartType
  label: string
  submitted: boolean
  answers: ReviewInterviewAnswer[] | null
  /** Questions the candidate asked the interviewer in the closing wrap-up (not graded). */
  candidateQa: ReviewCandidateQa[] | null
  aiScore: number | null
  /** Final overall AI evaluation of the interview (whole interview + closing Q&A). */
  aiSummary: string | null
  aiStrengths: string | null
  aiImprovements: string | null
  aiGraded: boolean
  reviewDecision: ReviewDecision
  reviewedBy: string | null
  reviewedAt: string | null
  reviewed: boolean
}

/** One human-run stage (Human / Final interview). */
export interface ReviewHumanStage {
  stageType: AssessmentPartType
  label: string
  status: StageStatus
  meetingLink: string | null
  scheduledAt: string | null
  notes: string | null
  decidedBy: string | null
  decidedAt: string | null
}

export interface ReviewDetail {
  id: number
  jobPostingId: number
  jobTitle: string | null
  department: string | null
  /** Role the applicant is converted into on hire (from the posting). null = not configured. */
  hireUserRoleId: number | null
  hireUserRoleName: string | null
  // Employment-config seeds from the posting — initial values for the give-offer form.
  hireJobPositionId: number | null
  hireJobPositionTitle: string | null
  hireDepartment: string | null
  hireWorkType: string | null
  hirePostingType: string | null
  hireSalaryGradeId: number | null
  hireSalaryPeriod: string | null
  /** The extended offer/contract once one exists; null before an offer is given. */
  offer: OfferView | null
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
  /** AI interview stages (HR AI + Technical AI), each with answers, grade, review and decision. */
  interviews: ReviewInterviewBlock[] | null
  /** Human-run stages (Human / Final interview). */
  humanStages: ReviewHumanStage[] | null
}

/** HR's negotiated employment config when extending an offer. */
export interface OfferPayload {
  userRoleId: number
  jobPositionId?: number | null
  salaryGradeId?: number | null
  employmentType: string
  workType?: string | null
  salaryPeriod?: string | null
  leaveCredits?: LeaveCredits | null
  startDate: string // "YYYY-MM-DD"
  probationEndDate?: string | null
  notes?: string | null
  /** TRUE = save schedulePolicy as a USER override for the hire; FALSE = clear; omit = none. */
  overrideSchedule?: boolean
  schedulePolicy?: SchedulePolicyPayload | null
}

export interface ReviewPayload {
  /** Per-question comments, aligned by index to the stage's answers. Blank = not reviewed. */
  reviewerComments: string[]
}

export interface InterviewSummaryPayload {
  summary: string
  strengths: string
  improvements: string
}

export interface HumanStagePayload {
  status?: StageStatus
  meetingLink?: string
  scheduledAt?: string
  notes?: string
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
  /** Extend an employment offer with the negotiated config; moves the application to OFFER. */
  giveOffer: (id: number, payload: OfferPayload) =>
    api
      .post<ReviewDetail>(`/hr/review/applications/${id}/offer`, payload)
      .then((r) => r.data),
  /** Grade (or re-grade) one AI interview stage's answers. */
  grade: (id: number, partType: AssessmentPartType) =>
    api
      .post<ReviewDetail>(
        `/hr/review/applications/${id}/interviews/${partType}/grade`,
        undefined,
        { timeout: AI_GRADE_TIMEOUT }
      )
      .then((r) => r.data),
  /** Save the reviewer's per-question comments for one AI interview stage. */
  saveReview: (id: number, partType: AssessmentPartType, payload: ReviewPayload) =>
    api
      .post<ReviewDetail>(
        `/hr/review/applications/${id}/interviews/${partType}/review`,
        payload
      )
      .then((r) => r.data),
  /** Save the reviewer's manual edit of an interview's overall evaluation. */
  editSummary: (
    id: number,
    partType: AssessmentPartType,
    payload: InterviewSummaryPayload
  ) =>
    api
      .post<ReviewDetail>(
        `/hr/review/applications/${id}/interviews/${partType}/summary`,
        payload
      )
      .then((r) => r.data),
  /** Record the reviewer's pass/reject decision for one AI interview stage. */
  decideInterview: (
    id: number,
    partType: AssessmentPartType,
    decision: ReviewDecision
  ) =>
    api
      .post<ReviewDetail>(
        `/hr/review/applications/${id}/interviews/${partType}/decision`,
        { decision }
      )
      .then((r) => r.data),
  /** Create/update a human-run stage (Human / Final interview). */
  upsertStage: (
    id: number,
    stageType: AssessmentPartType,
    payload: HumanStagePayload
  ) =>
    api
      .put<ReviewDetail>(
        `/hr/review/applications/${id}/stages/${stageType}`,
        payload
      )
      .then((r) => r.data),
  /** The full hiring pipeline (HR view, with interviewer notes). */
  pipeline: (id: number) =>
    api
      .get<Pipeline>(`/hr/review/applications/${id}/pipeline`)
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
