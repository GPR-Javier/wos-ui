"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { employeeApi } from "@/lib/employee-api"

export function useAttendance(params: { page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: ["employee", "attendance", params],
    queryFn: () => employeeApi.attendance(params),
  })
}

export function useAttendanceHeatmap() {
  return useQuery({
    queryKey: ["employee", "attendance", "heatmap"],
    queryFn: () => employeeApi.attendanceHeatmap(),
  })
}

export function useClockIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => employeeApi.clockIn(),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["employee", "attendance"] }),
  })
}

export function useClockOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => employeeApi.clockOut(),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["employee", "attendance"] }),
  })
}

export function useBreakStart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type: string) => employeeApi.breakStart(type),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["employee", "attendance"] }),
  })
}

export function useBreakEnd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => employeeApi.breakEnd(),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["employee", "attendance"] }),
  })
}

export function usePayslips(params: { page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: ["employee", "payslips", params],
    queryFn: () => employeeApi.payslips(params),
  })
}

export function useEmployeeStats() {
  return useQuery({
    queryKey: ["employee", "stats"],
    queryFn: employeeApi.stats,
  })
}

export function useEmployeeProfile() {
  return useQuery({
    queryKey: ["employee", "profile"],
    queryFn: employeeApi.profile,
  })
}

export function useLeaveBalances() {
  return useQuery({
    queryKey: ["employee", "leave-balances"],
    queryFn: employeeApi.leaveBalances,
  })
}

export function useEmployeeEvaluations() {
  return useQuery({
    queryKey: ["employee", "evaluations"],
    queryFn: employeeApi.evaluations,
  })
}

export function useEmployeeDocuments() {
  return useQuery({
    queryKey: ["employee", "documents"],
    queryFn: employeeApi.documents,
  })
}
