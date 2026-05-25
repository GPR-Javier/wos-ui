"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  orApi,
  type OfficialReceiptStatus,
  type OfficialReceiptCategory,
  type CreateOrPayload,
} from "@/lib/or-api"

const KEY = ["official-receipts"] as const

export function useMyOfficialReceipts(
  params: { status?: OfficialReceiptStatus; page?: number; size?: number } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => orApi.listMine(params),
  })
}

export function useAllOfficialReceipts(
  params: {
    status?: OfficialReceiptStatus
    search?: string
    category?: OfficialReceiptCategory
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => orApi.listAll(params),
  })
}

export function useCreateOfficialReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      payload,
      files,
    }: {
      payload: CreateOrPayload
      files?: File[]
    }) => orApi.createMine(payload, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelOfficialReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => orApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveOfficialReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote?: string | null }) =>
      orApi.approve(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRejectOfficialReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote?: string | null }) =>
      orApi.reject(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReimburseOfficialReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: number; reviewNote?: string | null }) =>
      orApi.markReimbursed(id, reviewNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
