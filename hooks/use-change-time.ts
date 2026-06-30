"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  changeTimeApi,
  type ChangeTimeStatus,
  type CreateChangeTimePayload,
} from "@/lib/change-time-api"

const KEY = ["change-time-requests"] as const

export function useMyChangeTimeRequests(
  params: {
    status?: ChangeTimeStatus
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => changeTimeApi.listMine(params),
  })
}

export function useAllChangeTimeRequests(
  params: {
    status?: ChangeTimeStatus
    search?: string
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => changeTimeApi.listAll(params),
  })
}

export function useCreateChangeTimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateChangeTimePayload) =>
      changeTimeApi.createMine(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateChangeTimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CreateChangeTimePayload }) =>
      changeTimeApi.updateMine(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteChangeTimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => changeTimeApi.deleteMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSubmitChangeTimeDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => changeTimeApi.submitDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelChangeTimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => changeTimeApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveChangeTimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => changeTimeApi.approve(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectChangeTimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => changeTimeApi.reject(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReturnChangeTimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote: string }) =>
      changeTimeApi.returnForRevision(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
