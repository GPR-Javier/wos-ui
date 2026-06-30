"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  coeApi,
  saveBlob,
  type CoeStatus,
  type CreateCoePayload,
} from "@/lib/coe-api"

const KEY = ["coe-requests"] as const

export function useDownloadCoeDocument() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: number; filename?: string }) =>
      coeApi
        .downloadDocument(id)
        .then((blob) => saveBlob(blob, filename ?? `coe-${id}.pdf`)),
  })
}

export function useMyCoeRequests(
  params: {
    status?: CoeStatus
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "me", params],
    queryFn: () => coeApi.listMine(params),
  })
}

export function useAllCoeRequests(
  params: {
    status?: CoeStatus
    search?: string
    from?: string
    to?: string
    page?: number
    size?: number
  } = {}
) {
  return useQuery({
    queryKey: [...KEY, "all", params],
    queryFn: () => coeApi.listAll(params),
  })
}

export function useCreateCoeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCoePayload) => coeApi.createMine(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCancelCoeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => coeApi.cancelMine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMarkCoeUnderReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string | null }) =>
      coeApi.markUnderReview(id, remarks),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useApproveCoeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      remarks,
      signature,
    }: {
      id: number
      remarks?: string | null
      signature?: string | null
    }) => coeApi.approve(id, remarks, signature),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMyCoeSignature(enabled = true) {
  return useQuery({
    queryKey: [...KEY, "my-signature"],
    queryFn: coeApi.mySignature,
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useRejectCoeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string | null }) =>
      coeApi.reject(id, remarks),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReleaseCoeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      documentUrl,
    }: {
      id: number
      documentUrl?: string | null
    }) => coeApi.release(id, documentUrl),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
