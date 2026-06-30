"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  scheduleChangeRequestApi,
  type ChangeRequestStatus,
  type CreateChangeRequestPayload,
} from "@/lib/schedule-change-request-api"

const KEY = ["schedule-change-request"] as const

export function useMyChangeRequests(
  params: { from?: string; to?: string; page?: number; size?: number } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => scheduleChangeRequestApi.listMine(params),
  })
}

export function useAllChangeRequests(
  params: {
    status?: ChangeRequestStatus
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => scheduleChangeRequestApi.listAll(params),
  })
}

export function useCreateChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateChangeRequestPayload) =>
      scheduleChangeRequestApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelMyChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => scheduleChangeRequestApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      scheduleChangeRequestApi.approve(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ["schedule-policy"] })
    },
  })
}

export function useRejectChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      scheduleChangeRequestApi.reject(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
