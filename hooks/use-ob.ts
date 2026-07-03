"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { obApi, type ObStatus, type CreateObPayload } from "@/lib/ob-api"

const KEY = ["ob-requests"] as const

export function useMyObRequests(
  params: {
    status?: ObStatus
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => obApi.listMine(params),
  })
}

export function useAllObRequests(
  params: {
    status?: ObStatus
    search?: string
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => obApi.listAll(params),
  })
}

export function useCreateObRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateObPayload) => obApi.createMine(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateObRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CreateObPayload }) =>
      obApi.updateMine(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteObRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => obApi.deleteMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSubmitObDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => obApi.submitDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelObRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => obApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveObRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => obApi.approve(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectObRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => obApi.reject(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReturnObRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote: string }) =>
      obApi.returnForRevision(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
