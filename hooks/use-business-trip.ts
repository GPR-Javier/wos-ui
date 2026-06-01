"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  businessTripApi,
  type TripStatus,
  type CreateTripPayload,
} from "@/lib/business-trip-api"

const KEY = ["business-trips"] as const

export function useMyBusinessTrips(
  params: { status?: TripStatus; page?: number; size?: number } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => businessTripApi.listMine(params),
  })
}

export function useAllBusinessTrips(
  params: {
    status?: TripStatus
    search?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => businessTripApi.listAll(params),
  })
}

export function useCreateBusinessTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTripPayload) => businessTripApi.createMine(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelBusinessTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => businessTripApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveBusinessTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => businessTripApi.approve(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectBusinessTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => businessTripApi.reject(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCompleteBusinessTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
    }: {
      id: number
      reviewNote?: string | null
    }) => businessTripApi.markCompleted(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
