"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  overtimeApi,
  type OvertimeStatus,
  type CreateOvertimePayload,
} from "@/lib/overtime-api"

const KEY = ["overtime-requests"] as const

export function useMyOvertimeRequests(
  params: { status?: OvertimeStatus; page?: number; size?: number } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => overtimeApi.listMine(params),
  })
}

export function useAllOvertimeRequests(
  params: {
    status?: OvertimeStatus
    search?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => overtimeApi.listAll(params),
  })
}

export function useCreateOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOvertimePayload) => overtimeApi.createMine(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSubmitOvertimeDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => overtimeApi.submitDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => overtimeApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => overtimeApi.approve(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => overtimeApi.reject(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
