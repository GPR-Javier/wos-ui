"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  scheduleApi,
  type ScheduleFilters,
  type UploadSchedulePayload,
} from "@/lib/schedule-api"

export function useScheduleVersions() {
  return useQuery({
    queryKey: ["schedules", "versions"],
    queryFn: scheduleApi.versions,
  })
}

export function useScheduleEntries(params: ScheduleFilters = {}) {
  return useQuery({
    queryKey: ["schedules", "entries", params],
    queryFn: () => scheduleApi.entries(params),
  })
}

export function useUploadSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UploadSchedulePayload) => scheduleApi.upload(payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["schedules", "versions"] }),
  })
}

export function useActivateVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => scheduleApi.activateVersion(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["schedules", "versions"] }),
  })
}

export function useArchiveVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => scheduleApi.archiveVersion(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["schedules", "versions"] }),
  })
}
