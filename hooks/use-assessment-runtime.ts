"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  assessmentRuntimeApi,
  type AnswerInput,
} from "@/lib/assessment-runtime-api"
import type { AssessmentPartType } from "@/lib/assessment-api"

export function useAssessmentOverview(applicationId: number) {
  return useQuery({
    queryKey: ["assessment", "overview", applicationId],
    queryFn: () => assessmentRuntimeApi.overview(applicationId),
    enabled: Number.isFinite(applicationId),
  })
}

export function useStartPart(applicationId: number) {
  return useMutation({
    mutationFn: (partType: AssessmentPartType) =>
      assessmentRuntimeApi.startPart(applicationId, partType),
  })
}

export function useSubmitPart(applicationId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      partType,
      answers,
    }: {
      partType: AssessmentPartType
      answers: AnswerInput[]
    }) => assessmentRuntimeApi.submitPart(applicationId, partType, answers),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["assessment", "overview", applicationId],
      }),
  })
}
