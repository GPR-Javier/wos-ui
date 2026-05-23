"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { hrApi } from "@/lib/hr-api"

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
