"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  overtimeApi,
  type OvertimeStatus,
  type CreateOvertimePayload,
  type AuthorizeOvertimePayload,
  type BulkAuthorizePayload,
  type ClaimOvertimePayload,
} from "@/lib/overtime-api"

const KEY = ["overtime-requests"] as const

/** Shared shape for the approve/reject/return review mutations. */
type ReviewArgs = { id: number; reviewNote?: string | null }

export function useMyOvertimeRequests(
  params: {
    status?: OvertimeStatus
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
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
    from?: string
    to?: string
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

// ── Phase 1: authorization (employee) ──

export function useCreateOvertimeAuthorization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AuthorizeOvertimePayload) =>
      overtimeApi.createAuthorization(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeclineOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string | null }) =>
      overtimeApi.decline(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useResubmitOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => overtimeApi.resubmit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ── Phase 2: claim (employee) ──

export function useSubmitOvertimeClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ClaimOvertimePayload }) =>
      overtimeApi.submitClaim(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ── Emergency (employee) ──

export function useCreateEmergencyOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOvertimePayload) =>
      overtimeApi.createEmergency(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ── Phase 1 review (approver) ──

export function useBulkAuthorizeOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BulkAuthorizePayload) => overtimeApi.bulkAuthorize(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useAuthorizeOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: ReviewArgs) =>
      overtimeApi.authorize(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectOvertimeAuthorization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: ReviewArgs) =>
      overtimeApi.rejectAuthorization(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReturnOvertimeAuthorization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote: string }) =>
      overtimeApi.returnAuthorization(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// ── Phase 2 review (approver) ──

export function useApproveOvertimeClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: ReviewArgs) =>
      overtimeApi.approveClaim(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectOvertimeClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: ReviewArgs) =>
      overtimeApi.rejectClaim(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReturnOvertimeClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote: string }) =>
      overtimeApi.returnClaim(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
