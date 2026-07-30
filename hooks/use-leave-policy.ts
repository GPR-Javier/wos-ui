"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  leavePolicyApi,
  type LeaveTypeCode,
  type UpdateLeavePolicyPayload,
} from "@/lib/leave-policy-api"

const KEY = ["leave", "policies"] as const

export function useLeavePolicies(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => leavePolicyApi.list(),
    enabled,
  })
}

/**
 * Company defaults keyed the way `LeaveCredits` is, for the contract / offer forms.
 *
 * Only enabled types contribute — a disabled type yields no entitlement server-side, so showing
 * its number as an inheritable default would be a lie. `flexi` has no policy of its own; the
 * shared pool falls back to Vacation, matching how the balance service treats it.
 */
export function useLeaveCreditDefaults() {
  const { data: policies = [], ...rest } = useLeavePolicies()
  const byType = (t: string) =>
    policies.find((p) => p.leaveType === t && p.enabled)?.defaultCredits ?? null

  return {
    ...rest,
    defaults: {
      vacation: byType("VACATION"),
      sick: byType("SICK"),
      emergency: byType("EMERGENCY"),
      flexi: byType("VACATION"),
    },
  }
}

export function useUpdateLeavePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      leaveType: LeaveTypeCode
      payload: UpdateLeavePolicyPayload
    }) => leavePolicyApi.update(vars.leaveType, vars.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      // Balances are derived from these defaults, so any open widget is now stale.
      qc.invalidateQueries({ queryKey: ["employee", "leave-balances"] })
    },
  })
}
