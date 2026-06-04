import { api } from "./api"
import type { AssessmentPartType } from "./assessment-api"

export interface PartOverview {
  type: AssessmentPartType
  orderIndex: number
  questionCount: number
  minPassingScore: number | null
  maxRetakes: number | null
  timeLimitSeconds: number | null
  gated: boolean
  runnable: boolean
  available: boolean
  attempted: boolean
  attemptsUsed: number
  passed: boolean | null
  lastScore: number | null
  /** AI interview submitted but awaiting a reviewer's pass/reject (gates the next stage). */
  awaitingReview: boolean
  /** Human-run stage status (Live/Final), set by HR: PENDING | UNDER_REVIEW | PASSED | REJECTED | SKIPPED. */
  stageStatus: string | null
  /** Candidate-facing meeting details for a scheduled human stage. */
  meetingLink: string | null
  scheduledAt: string | null
  stageNotes: string | null
}

export interface AssessmentOverview {
  applicationId: number
  jobPostingId: number
  jobTitle: string | null
  templateName: string
  completed: boolean
  parts: PartOverview[]
}

export interface RunQuestion {
  id: number
  text: string
  options: string[]
  category: string | null
  points: number
}

export interface StartResponse {
  partAttemptId: number
  partType: AssessmentPartType
  attemptNo: number
  timeLimitSeconds: number | null
  minPassingScore: number | null
  questions: RunQuestion[]
  /** True for a conversational AI interview (questions generated live, one at a time). */
  aiFollowUp?: boolean
  /** Total questions the AI follow-up interview will ask (opener + follow-ups). */
  maxQuestions?: number | null
}

export interface NextQuestionResponse {
  partAttemptId: number
  /** The next question to ask, or null when {@link done} is true. */
  question: string | null
  /** 1-based number of `question` within the interview. */
  questionNumber: number
  totalQuestions: number
  /** True when no more questions remain — the candidate should finish. */
  done: boolean
}

export interface SubmitResponse {
  score: number
  passed: boolean
  correctCount: number
  total: number
  minPassingScore: number | null
  canRetake: boolean
  assessmentCompleted: boolean
  /** Big Five trait → 0–100 (Personality parts only). */
  traitScores: Record<string, number> | null
  /** True when answers were captured for later AI grading (AI Interview). */
  pendingReview: boolean
}

export interface AnswerInput {
  questionId: number
  responseIndex?: number
  transcript?: string
}

export const assessmentRuntimeApi = {
  overview: (applicationId: number) =>
    api
      .get<AssessmentOverview>(`/hr/assessments/my/${applicationId}/overview`)
      .then((r) => r.data),
  startPart: (applicationId: number, partType: AssessmentPartType) =>
    api
      .post<StartResponse>(
        `/hr/assessments/my/${applicationId}/parts/${partType}/start`
      )
      .then((r) => r.data),
  submitPart: (
    applicationId: number,
    partType: AssessmentPartType,
    answers: AnswerInput[]
  ) =>
    api
      .post<SubmitResponse>(
        `/hr/assessments/my/${applicationId}/parts/${partType}/submit`,
        { answers }
      )
      .then((r) => r.data),
  /** Conversational AI interview: submit the answer just given, get the next question (or done). */
  nextQuestion: (
    applicationId: number,
    partType: AssessmentPartType,
    transcript: string
  ) =>
    api
      .post<NextQuestionResponse>(
        `/hr/assessments/my/${applicationId}/parts/${partType}/next`,
        { transcript }
      )
      .then((r) => r.data),
}
