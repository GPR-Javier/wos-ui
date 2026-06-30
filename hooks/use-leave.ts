"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import {
  leaveApi,
  type LeaveStatus,
  type CreateLeavePayload,
} from "@/lib/leave-api"

const KEY = ["leave-requests"] as const

type ReviewArgs = { id: number; reviewNote?: string | null }

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: KEY })
    // Filing/approval changes the derived balances + the admin (use-hr) list.
    qc.invalidateQueries({ queryKey: ["employee", "leave-balances"] })
    qc.invalidateQueries({ queryKey: ["hr", "leave-requests"] })
  }
}

export function useMyLeaveRequests(
  params: {
    status?: LeaveStatus
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => leaveApi.listMine(params),
    placeholderData: keepPreviousData,
  })
}

export function useAllLeaveRequests(
  params: {
    status?: string
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => leaveApi.listAll(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateLeaveRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: CreateLeavePayload) => leaveApi.createMine(body),
    onSuccess: invalidate,
  })
}

export function useUpdateLeaveRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CreateLeavePayload }) =>
      leaveApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useSubmitLeaveDraft() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => leaveApi.submitDraft(id),
    onSuccess: invalidate,
  })
}

export function useCancelLeaveRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => leaveApi.cancelMine(id),
    onSuccess: invalidate,
  })
}

export function useDeleteLeaveRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => leaveApi.deleteMine(id),
    onSuccess: invalidate,
  })
}

// ── Admin / HR review ──

export function useApproveLeaveRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, reviewNote }: ReviewArgs) =>
      leaveApi.approve(id, reviewNote),
    onSuccess: invalidate,
  })
}

export function useRejectLeaveRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, reviewNote }: ReviewArgs) =>
      leaveApi.reject(id, reviewNote),
    onSuccess: invalidate,
  })
}

export function useReturnLeaveRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote: string }) =>
      leaveApi.returnForRevision(id, reviewNote),
    onSuccess: invalidate,
  })
}
