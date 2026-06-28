"use client"

import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  overtimeRateApi,
  type UpdateOvertimeRatesPayload,
} from "@/lib/overtime-rate-api"
import { OT_RATE_MULTIPLIER, type OvertimeType } from "@/lib/overtime-api"

const KEY = ["overtime-rates"] as const

/** Raw rate rows (value, default, customized) — for the admin editor. */
export function useOvertimeRates() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => overtimeRateApi.list(),
  })
}

/**
 * The company's effective multiplier per overtime type, merged over the statutory defaults so every
 * type always resolves. Use this anywhere a rate is displayed instead of the static constant.
 */
export function useEffectiveOtRates(): Record<OvertimeType, number> {
  const { data } = useOvertimeRates()
  return useMemo(() => {
    const map = { ...OT_RATE_MULTIPLIER }
    for (const r of data ?? []) map[r.overtimeType] = r.multiplier
    return map
  }, [data])
}

export function useUpdateOvertimeRates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateOvertimeRatesPayload) =>
      overtimeRateApi.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
