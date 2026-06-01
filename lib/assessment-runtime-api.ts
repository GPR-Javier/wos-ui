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
}

export interface AnswerInput {
  questionId: number
  responseIndex: number
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
}
