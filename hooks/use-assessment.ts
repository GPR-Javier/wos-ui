"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  assessmentApi,
  type AssessmentPartType,
  type QuestionCategory,
  type QuestionPayload,
} from "@/lib/assessment-api"

export const ASSESSMENT_KEYS = {
  questions: (partType?: AssessmentPartType, category?: QuestionCategory) =>
    ["assessment", "questions", partType ?? "all", category ?? "all"] as const,
  sets: ["assessment", "sets"] as const,
  templates: ["assessment", "templates"] as const,
}

// ── Questions ─────────────────────────────────────────────────────────────────

export function useQuestions(
  filters: {
    partType?: AssessmentPartType
    category?: QuestionCategory
  } = {}
) {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.questions(filters.partType, filters.category),
    queryFn: () => assessmentApi.listQuestions(filters),
  })
}

function useInvalidateQuestions() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["assessment", "questions"] })
}

export function useCreateQuestion() {
  const invalidate = useInvalidateQuestions()
  return useMutation({
    mutationFn: (payload: QuestionPayload) =>
      assessmentApi.createQuestion(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateQuestion() {
  const invalidate = useInvalidateQuestions()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: QuestionPayload }) =>
      assessmentApi.updateQuestion(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteQuestion() {
  const invalidate = useInvalidateQuestions()
  return useMutation({
    mutationFn: (id: number) => assessmentApi.deleteQuestion(id),
    onSuccess: invalidate,
  })
}
