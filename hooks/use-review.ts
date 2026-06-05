"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  reviewApi,
  type ReviewPayload,
  type ReviewDecision,
  type HumanStagePayload,
  type InterviewSummaryPayload,
  type OfferPayload,
} from "@/lib/review-api"
import type { ApplicationStatus } from "@/lib/application-api"
import type { AssessmentPartType } from "@/lib/assessment-api"

export function useReviewList(status?: ApplicationStatus) {
  return useQuery({
    queryKey: ["review", "applications", status ?? "all"],
    queryFn: () => reviewApi.list(status),
  })
}

export function useReviewDetail(id: number | null) {
  return useQuery({
    queryKey: ["review", "application", id],
    queryFn: () => reviewApi.detail(id as number),
    enabled: id != null,
  })
}

export function useGradeApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      partType,
    }: {
      id: number
      partType: AssessmentPartType
    }) => reviewApi.grade(id, partType),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
    },
  })
}

export function useSaveReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      partType,
      payload,
    }: {
      id: number
      partType: AssessmentPartType
      payload: ReviewPayload
    }) => reviewApi.saveReview(id, partType, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
    },
  })
}

export function useEditInterviewSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      partType,
      payload,
    }: {
      id: number
      partType: AssessmentPartType
      payload: InterviewSummaryPayload
    }) => reviewApi.editSummary(id, partType, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
    },
  })
}

export function useDecideInterview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      partType,
      decision,
    }: {
      id: number
      partType: AssessmentPartType
      decision: ReviewDecision
    }) => reviewApi.decideInterview(id, partType, decision),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
      qc.invalidateQueries({ queryKey: ["review", "pipeline", vars.id] })
    },
  })
}

export function useUpsertStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      stageType,
      payload,
    }: {
      id: number
      stageType: AssessmentPartType
      payload: HumanStagePayload
    }) => reviewApi.upsertStage(id, stageType, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
      qc.invalidateQueries({ queryKey: ["review", "pipeline", vars.id] })
    },
  })
}

export function useReviewPipeline(id: number | null) {
  return useQuery({
    queryKey: ["review", "pipeline", id],
    queryFn: () => reviewApi.pipeline(id as number),
    enabled: id != null,
  })
}

export function useEnhanceComment() {
  return useMutation({
    mutationFn: ({
      id,
      text,
      question,
    }: {
      id: number
      text: string
      question: string
    }) => reviewApi.enhanceComment(id, text, question),
  })
}

export function useReviewCoverLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reviewApi.reviewCoverLetter(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["review", "application", id] })
    },
  })
}

export function useReviewResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reviewApi.reviewResume(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["review", "application", id] })
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
    },
  })
}

export function useSaveResumeText() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, text }: { id: number; text: string }) =>
      reviewApi.saveResumeText(id, text),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] }),
  })
}

export function useSuggestRejection() {
  return useMutation({
    mutationFn: ({ id, text }: { id: number; text?: string }) =>
      reviewApi.suggestRejection(id, text),
  })
}

export function useSetApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: number
      status: ApplicationStatus
      note?: string
    }) => reviewApi.setStatus(id, status, note),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
    },
  })
}

export function useGiveOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OfferPayload }) =>
      reviewApi.giveOffer(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
    },
  })
}
