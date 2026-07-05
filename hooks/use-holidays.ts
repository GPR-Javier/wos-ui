"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  holidayApi,
  type CreateHolidayPayload,
  type UpdateHolidayPayload,
} from "@/lib/holiday-api"

const KEY = ["holidays"] as const

export function useHolidays(
  params: { from?: string; until?: string } = {},
  enabled = true
) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () => holidayApi.list(params),
    enabled,
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateHolidayPayload) => holidayApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateHolidayPayload }) =>
      holidayApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => holidayApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
