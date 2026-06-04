import { api } from "./api"

export type PipelineStageStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "PASSED"
  | "REJECTED"
  | "SKIPPED"

export interface PipelineSubStep {
  key: string
  label: string
  status: "PENDING" | "PASSED"
}

export interface PipelineStage {
  /** APPLIED, ASSESSMENT, AI_INTERVIEW, AI_TECHNICAL_INTERVIEW, HR_INTERVIEW, FINAL_INTERVIEW, SHORTLISTED, OFFER, HIRED */
  key: string
  label: string
  status: PipelineStageStatus
  optional: boolean
  /** Assessment stage only. */
  subSteps: PipelineSubStep[] | null
  // Human stages:
  meetingLink: string | null
  scheduledAt: string | null
  notes: string | null
}

export interface Pipeline {
  applicationId: number
  overallStatus: string
  stages: PipelineStage[]
}

export const pipelineApi = {
  /** The signed-in applicant's own pipeline (internal notes stripped server-side). */
  mine: (applicationId: number) =>
    api
      .get<Pipeline>(`/hr/assessments/my/${applicationId}/pipeline`)
      .then((r) => r.data),
}
