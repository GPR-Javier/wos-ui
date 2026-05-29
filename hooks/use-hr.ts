"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { hrApi } from "@/lib/hr-api"
import type { CreateJobPayload } from "@/lib/hr-api"

export function useHrEmployees(
  params: { page?: number; size?: number; search?: string } = {}
) {
  return useQuery({
    queryKey: ["hr", "employees", params],
    queryFn: () => hrApi.employees(params),
  })
}

export function useLeaveRequests(
  params: { page?: number; size?: number; status?: string } = {}
) {
  return useQuery({
    queryKey: ["hr", "leave-requests", params],
    queryFn: () => hrApi.leaveRequests(params),
  })
}

export function useApproveLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => hrApi.approveLeave(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["hr", "leave-requests"] }),
  })
}

export function useRejectLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => hrApi.rejectLeave(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["hr", "leave-requests"] }),
  })
}

export function useJobs(params: { page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: ["hr", "jobs", params],
    queryFn: () => hrApi.jobs(params),
  })
}

/** No auth required — safe to call on the public careers page. */
export function usePublicJobs(params: { page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: ["public", "jobs", params],
    queryFn: () => hrApi.publicJobs(params),
    retry: false,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateJobPayload) => hrApi.createJob(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "jobs"] }),
  })
}

export function useUpdateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateJobPayload> }) =>
      hrApi.updateJob(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "jobs"] }),
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => hrApi.deleteJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "jobs"] }),
  })
}

export function useHrStats() {
  return useQuery({
    queryKey: ["hr", "stats"],
    queryFn: hrApi.stats,
  })
}

export function useHrEmployee(id: number) {
  return useQuery({
    queryKey: ["hr", "employees", id],
    queryFn: () => hrApi.employee(id),
    enabled: id > 0,
    retry: false,
  })
}
