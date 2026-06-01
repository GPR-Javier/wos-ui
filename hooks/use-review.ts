"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { reviewApi } from "@/lib/review-api"
import type { ApplicationStatus } from "@/lib/application-api"

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
    mutationFn: (id: number) => reviewApi.grade(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["review", "application", id] })
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
    },
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

export function useSetApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: ApplicationStatus; note?: string }) =>
      reviewApi.setStatus(id, status, note),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["review", "applications"] })
      qc.invalidateQueries({ queryKey: ["review", "application", vars.id] })
    },
  })
}
