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
