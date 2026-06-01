"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { applicationApi } from "@/lib/application-api"

export const APPLICATION_KEYS = {
  mine: ["applications", "mine"] as const,
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
