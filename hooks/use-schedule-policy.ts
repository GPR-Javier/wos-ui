"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  schedulePolicyApi,
  type PolicyScope,
  type SavePolicyRequest,
} from "@/lib/schedule-policy-api"

const POLICY_KEY = ["schedule-policy"] as const

export function useCurrentPolicy(scope: PolicyScope, scopeRef?: number | null) {
  return useQuery({
    queryKey: [...POLICY_KEY, "current", scope, scopeRef ?? null],
    queryFn: () => schedulePolicyApi.getCurrent(scope, scopeRef ?? null),
  })
}

export function usePolicyHistory(
  scope: PolicyScope,
  params: { scopeRef?: number | null; page?: number; size?: number } = {}
) {
  return useQuery({
    queryKey: [...POLICY_KEY, "history", scope, params],
    queryFn: () => schedulePolicyApi.history(scope, params),
  })
}

export function useSavePolicy(scope: PolicyScope) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SavePolicyRequest) => schedulePolicyApi.save(scope, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POLICY_KEY })
      qc.invalidateQueries({ queryKey: ["employee", "policy"] })
    },
  })
}

export function useMyPolicy() {
  return useQuery({
    queryKey: ["employee", "policy"],
    queryFn: schedulePolicyApi.myPolicy,
    staleTime: 60_000, // policy rarely changes; don't refetch on every focus
  })
}

export function useResolveForUser(userId: number | null | undefined) {
  return useQuery({
    queryKey: [...POLICY_KEY, "resolve", userId],
    queryFn: () => schedulePolicyApi.resolveForUser(userId as number),
    enabled: userId != null,
  })
}

export function useOverrides(scope: PolicyScope) {
  return useQuery({
    queryKey: [...POLICY_KEY, "overrides", scope],
    queryFn: () => schedulePolicyApi.listOverrides(scope),
  })
}

export function useResetPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      scope,
      scopeRef,
    }: {
      scope: PolicyScope
      scopeRef?: number | null
    }) => schedulePolicyApi.reset(scope, scopeRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: POLICY_KEY })
      qc.invalidateQueries({ queryKey: ["employee", "policy"] })
    },
  })
}

export function useMyPolicyHistory(params: { page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: ["employee", "policy", "history", params],
    queryFn: () => schedulePolicyApi.myHistory(params),
  })
}
