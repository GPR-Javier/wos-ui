import { api } from "./api"

// ── Enums (mirror wos-common) ─────────────────────────────────────────────────

export type AssessmentPartType =
  | "BASIC_QA"
  | "PERSONALITY"
  | "AI_INTERVIEW"
  | "HR_INTERVIEW"
  | "FINAL_INTERVIEW"

export type QuestionKind =
  | "MULTIPLE_CHOICE"
  | "ESSAY"
  | "SHORT_ANSWER"
  | "LIKERT"
  | "OPEN_SPOKEN"

export type QuestionCategory =
  | "IQ"
  | "MATH"
  | "ENGLISH"
  | "SITUATIONAL"
  | "GENERAL"
  | "NONE"

export type InterviewMode = "MANUAL" | "AI_GENERATED"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssessmentQuestion {
  id: number
  partType: AssessmentPartType
  kind: QuestionKind
  category: QuestionCategory
  text: string
  options: string[]
  correctOption: number | null
  trait: string | null
  rubric: string | null
  points: number
  active: boolean
}

export interface QuestionPayload {
  partType: AssessmentPartType
  kind: QuestionKind
  category?: QuestionCategory
  text: string
  options?: string[]
  correctOption?: number | null
  trait?: string | null
  rubric?: string | null
  points?: number
  active?: boolean
}

export interface QuestionSet {
  id: number
  name: string
  description: string | null
  partType: AssessmentPartType
  active: boolean
  questions: AssessmentQuestion[]
}

export interface QuestionSetPayload {
  name: string
  description?: string | null
  partType: AssessmentPartType
  active?: boolean
  questionIds: number[]
}

export interface AssessmentPart {
  id: number
  type: AssessmentPartType
  orderIndex: number
  questionSetId: number | null
  questionSetName: string | null
  interviewMode: InterviewMode | null
  timeLimitSeconds: number | null
  minPassingScore: number | null
  maxRetakes: number | null
  reshuffle: boolean
  gated: boolean
}

export interface AssessmentTemplate {
  id: number
  name: string
  description: string | null
  active: boolean
  parts: AssessmentPart[]
}

export interface PartPayload {
  type: AssessmentPartType
  questionSetId?: number | null
  interviewMode?: InterviewMode | null
  timeLimitSeconds?: number | null
  minPassingScore?: number | null
  maxRetakes?: number | null
  reshuffle?: boolean
  gated?: boolean
}

export interface TemplatePayload {
  name: string
  description?: string | null
  active?: boolean
  parts: PartPayload[]
}

export interface JobAssessment {
  id: number
  jobPostingId: number
  templateId: number
  templateName: string
  template: AssessmentTemplate
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const PART_TYPE_LABEL: Record<AssessmentPartType, string> = {
  BASIC_QA: "Basic Q&A",
  PERSONALITY: "Personality",
  AI_INTERVIEW: "AI Interview",
  HR_INTERVIEW: "HR Interview",
  FINAL_INTERVIEW: "Final Interview",
}

export const QUESTION_KIND_LABEL: Record<QuestionKind, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  ESSAY: "Essay",
  SHORT_ANSWER: "Short answer",
  LIKERT: "Likert scale",
  OPEN_SPOKEN: "Spoken (open)",
}

export const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  IQ: "IQ / Logic",
  MATH: "Math",
  ENGLISH: "English / Grammar",
  SITUATIONAL: "Situational",
  GENERAL: "General",
  NONE: "—",
}

/** Question kinds valid for each part type (drives the create/edit form). */
export const KINDS_FOR_PART: Record<AssessmentPartType, QuestionKind[]> = {
  BASIC_QA: ["MULTIPLE_CHOICE", "ESSAY", "SHORT_ANSWER"],
  PERSONALITY: ["LIKERT"],
  AI_INTERVIEW: ["OPEN_SPOKEN"],
  HR_INTERVIEW: ["OPEN_SPOKEN"],
  FINAL_INTERVIEW: ["OPEN_SPOKEN"],
}

export const BASIC_QA_CATEGORIES: QuestionCategory[] = [
  "IQ",
  "MATH",
  "ENGLISH",
  "SITUATIONAL",
  "GENERAL",
]

/** Big Five (OCEAN) traits a personality Likert item can score. */
export const PERSONALITY_TRAITS = [
  "OPENNESS",
  "CONSCIENTIOUSNESS",
  "EXTRAVERSION",
  "AGREEABLENESS",
  "NEUROTICISM",
] as const

// ── API ───────────────────────────────────────────────────────────────────────

export const assessmentApi = {
  // Questions
  listQuestions: (
    params: { partType?: AssessmentPartType; category?: QuestionCategory } = {}
  ) =>
    api
      .get<AssessmentQuestion[]>("/hr/assessments/questions", { params })
      .then((r) => r.data),
  createQuestion: (payload: QuestionPayload) =>
    api
      .post<AssessmentQuestion>("/hr/assessments/questions", payload)
      .then((r) => r.data),
  updateQuestion: (id: number, payload: QuestionPayload) =>
    api
      .put<AssessmentQuestion>(`/hr/assessments/questions/${id}`, payload)
      .then((r) => r.data),
  deleteQuestion: (id: number) => api.delete(`/hr/assessments/questions/${id}`),

  // Question sets
  listSets: (params: { partType?: AssessmentPartType } = {}) =>
    api
      .get<QuestionSet[]>("/hr/assessments/question-sets", { params })
      .then((r) => r.data),
  getSet: (id: number) =>
    api
      .get<QuestionSet>(`/hr/assessments/question-sets/${id}`)
      .then((r) => r.data),
  createSet: (payload: QuestionSetPayload) =>
    api
      .post<QuestionSet>("/hr/assessments/question-sets", payload)
      .then((r) => r.data),
  updateSet: (id: number, payload: QuestionSetPayload) =>
    api
      .put<QuestionSet>(`/hr/assessments/question-sets/${id}`, payload)
      .then((r) => r.data),
  deleteSet: (id: number) => api.delete(`/hr/assessments/question-sets/${id}`),

  // Templates
  listTemplates: () =>
    api
      .get<AssessmentTemplate[]>("/hr/assessments/templates")
      .then((r) => r.data),
  getTemplate: (id: number) =>
    api
      .get<AssessmentTemplate>(`/hr/assessments/templates/${id}`)
      .then((r) => r.data),
  createTemplate: (payload: TemplatePayload) =>
    api
      .post<AssessmentTemplate>("/hr/assessments/templates", payload)
      .then((r) => r.data),
  updateTemplate: (id: number, payload: TemplatePayload) =>
    api
      .put<AssessmentTemplate>(`/hr/assessments/templates/${id}`, payload)
      .then((r) => r.data),
  deleteTemplate: (id: number) => api.delete(`/hr/assessments/templates/${id}`),

  // Job ↔ template link
  getJobAssessment: (jobId: number) =>
    api
      .get<JobAssessment | "">(`/hr/assessments/jobs/${jobId}`)
      .then((r) => r.data || null),
  attachTemplate: (jobId: number, templateId: number) =>
    api
      .post<JobAssessment>(`/hr/assessments/jobs/${jobId}`, { templateId })
      .then((r) => r.data),
  detachTemplate: (jobId: number) =>
    api.delete(`/hr/assessments/jobs/${jobId}`),

  // Per-job AI interview question override
  getJobInterview: (jobId: number) =>
    api
      .get<JobInterviewConfig>(`/hr/assessments/jobs/${jobId}/interview`)
      .then((r) => r.data),
  saveJobInterview: (jobId: number, payload: JobInterviewConfig) =>
    api
      .put<JobInterviewConfig>(
        `/hr/assessments/jobs/${jobId}/interview`,
        payload
      )
      .then((r) => r.data),

  /** AI-suggest a rubric for an interview question (optionally tailored to a posting). */
  suggestRubric: (question: string, jobId?: number) =>
    api
      .post<{
        rubric: string
      }>("/hr/assessments/suggest-rubric", { question, jobId })
      .then((r) => r.data.rubric),
}

export interface JobInterviewConfig {
  useCustom: boolean
  questionIds: number[]
  /** Conversational AI interview: questions generated live from resume + role (no question bank). */
  aiFollowUpEnabled?: boolean
  /** Total questions asked in AI follow-up mode (opener + follow-ups). */
  maxQuestions?: number
}
