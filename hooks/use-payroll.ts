"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { payrollApi, type PayslipFilters } from "@/lib/payroll-api"

export function usePayrollStats() {
  return useQuery({
    queryKey: ["payroll", "stats"],
    queryFn: payrollApi.stats,
  })
}

export function usePayrollRuns(params: { page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: ["payroll", "runs", params],
    queryFn: () => payrollApi.runs(params),
  })
}

export function useRunSteps(id: number | null) {
  return useQuery({
    queryKey: ["payroll", "runs", id, "steps"],
    queryFn: () => payrollApi.runSteps(id!),
    enabled: id != null,
  })
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { periodStart: string; periodEnd: string }) =>
      payrollApi.createRun(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll", "runs"] }),
  })
}

export function useProcessRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => payrollApi.processRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  })
}

export function useReleaseRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => payrollApi.releaseRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  })
}

export function useAdminPayslips(params: PayslipFilters = {}) {
  return useQuery({
    queryKey: ["payroll", "payslips", params],
    queryFn: () => payrollApi.payslips(params),
  })
}
