"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  salaryDisputeApi,
  type DisputeStatus,
  type CreateDisputePayload,
} from "@/lib/salary-dispute-api"

const KEY = ["salary-disputes"] as const

export function useMySalaryDisputes(
  params: { status?: DisputeStatus; page?: number; size?: number } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => salaryDisputeApi.listMine(params),
  })
}

export function useAllSalaryDisputes(
  params: {
    status?: DisputeStatus
    search?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => salaryDisputeApi.listAll(params),
  })
}

export function useCreateSalaryDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDisputePayload) =>
      salaryDisputeApi.createMine(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelSalaryDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => salaryDisputeApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMarkDisputeUnderReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      resolutionNotes,
    }: {
      id: number
      resolutionNotes?: string | null
    }) => salaryDisputeApi.markUnderReview(id, resolutionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRequestDisputeDocuments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      resolutionNotes,
    }: {
      id: number
      resolutionNotes: string
    }) => salaryDisputeApi.requestDocuments(id, resolutionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveSalaryDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      resolutionNotes,
    }: {
      id: number
      resolutionNotes?: string | null
    }) => salaryDisputeApi.approve(id, resolutionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectSalaryDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      resolutionNotes,
    }: {
      id: number
      resolutionNotes?: string | null
    }) => salaryDisputeApi.reject(id, resolutionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCloseSalaryDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      resolutionNotes,
    }: {
      id: number
      resolutionNotes?: string | null
    }) => salaryDisputeApi.close(id, resolutionNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
