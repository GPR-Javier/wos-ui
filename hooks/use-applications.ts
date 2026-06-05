"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { applicationApi } from "@/lib/application-api"

export const APPLICATION_KEYS = {
  mine: ["applications", "mine"] as const,
  offer: (id: number) => ["applications", "offer", id] as const,
}

export function useMyApplications(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: APPLICATION_KEYS.mine,
    queryFn: applicationApi.mine,
    enabled: options.enabled ?? true,
  })
}

export function useWithdrawApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => applicationApi.withdraw(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: APPLICATION_KEYS.mine }),
  })
}

export function useMyOffer(id: number | null) {
  return useQuery({
    queryKey: APPLICATION_KEYS.offer(id as number),
    queryFn: () => applicationApi.getOffer(id as number),
    enabled: id != null,
  })
}

export function useAcceptOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, signature }: { id: number; signature: string }) =>
      applicationApi.acceptOffer(id, signature),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: APPLICATION_KEYS.mine })
      qc.invalidateQueries({ queryKey: APPLICATION_KEYS.offer(id) })
    },
  })
}

export function useDeclineOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => applicationApi.declineOffer(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: APPLICATION_KEYS.mine })
      qc.invalidateQueries({ queryKey: APPLICATION_KEYS.offer(id) })
    },
  })
}
