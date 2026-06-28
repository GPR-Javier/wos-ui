import { api } from "./api"
import type { PageResponse } from "./admin-api"
import type { OvertimeType } from "./overtime-api"

export interface PayslipOvertimeLine {
  overtimeType: OvertimeType
  hours: number
  amount: number
}

// ── Types ──────────────────────────────────────────────────────────────────

export type RunStatus = "draft" | "processing" | "generated" | "released"
export type PayslipStatus = "draft" | "generated" | "released"
export type StepStatus = "pending" | "in-progress" | "done"

export interface PayrollRun {
  id: number
  period: string
  periodStart: string
  periodEnd: string
  status: RunStatus
  totalAmount: number
  employeeCount: number
  createdAt: string
  processedAt: string | null
  releasedAt: string | null
}

export interface RunStep {
  step: string
  label: string
  completedAt: string | null
  status: StepStatus
}

export interface AdminPayslip {
  id: number
  runId: number
  employeeId: string
  employeeName: string
  position: string
  teamLeader: string
  period: string
  periodStart: string
  periodEnd: string
  // Earnings
  basicSalary: number
  incentives: number
  overtimePay: number
  overtimeBreakdown: PayslipOvertimeLine[]
  grossPay: number
  // Deductions
  absences: number
  latePenalties: number
  cashAdvances: number
  sss: number
  philhealth: number
  pagibig: number
  tax: number
  totalDeductions: number
  netPay: number
  status: PayslipStatus
  releasedAt: string | null
}

export interface PayrollStats {
  totalPayrollAmount: number
  pendingProcessing: number
  releasedPayroll: number
  incentivesTotal: number
  totalBasicSalary: number
  totalIncentives: number
  totalAbsences: number
  totalLatePenalties: number
  totalCashAdvances: number
  totalStatutoryDeductions: number
}

export interface PayslipFilters {
  runId?: number
  search?: string
  status?: string
  page?: number
  size?: number
}

// ── API ────────────────────────────────────────────────────────────────────
//
// Backend endpoints (Spring Boot, context-path /api):
//
//  GET  /payroll/stats
//  GET  /payroll/runs                   → Page<PayrollRun>
//  POST /payroll/runs                   body: { periodStart, periodEnd }
//  GET  /payroll/runs/{id}/steps        → RunStep[]
//  POST /payroll/runs/{id}/process
//  POST /payroll/runs/{id}/release
//  GET  /payroll/payslips               paginated, params: PayslipFilters
//  GET  /payroll/payslips/{id}          → AdminPayslip
//  GET  /payroll/payslips/{id}/pdf      → blob
//  GET  /payroll/payslips/{id}/excel    → blob
//

async function downloadBlob(url: string, filename: string) {
  const res = await api.get(url, { responseType: "blob" })
  const href = URL.createObjectURL(res.data as Blob)
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}

export const payrollApi = {
  stats: () => api.get<PayrollStats>("/payroll/stats").then((r) => r.data),

  runs: (params: { page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<PayrollRun>>("/payroll/runs", {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  createRun: (body: { periodStart: string; periodEnd: string }) =>
    api.post<PayrollRun>("/payroll/runs", body).then((r) => r.data),

  runSteps: (id: number) =>
    api.get<RunStep[]>(`/payroll/runs/${id}/steps`).then((r) => r.data),

  processRun: (id: number) =>
    api.post<PayrollRun>(`/payroll/runs/${id}/process`).then((r) => r.data),

  releaseRun: (id: number) =>
    api.post<PayrollRun>(`/payroll/runs/${id}/release`).then((r) => r.data),

  payslips: (params: PayslipFilters = {}) =>
    api
      .get<PageResponse<AdminPayslip>>("/payroll/payslips", {
        params: { page: 0, size: 25, ...params },
      })
      .then((r) => r.data),

  payslip: (id: number) =>
    api.get<AdminPayslip>(`/payroll/payslips/${id}`).then((r) => r.data),

  downloadPdf: (id: number, fileName: string) =>
    downloadBlob(`/payroll/payslips/${id}/pdf`, fileName),

  downloadExcel: (id: number, fileName: string) =>
    downloadBlob(`/payroll/payslips/${id}/excel`, fileName),
}
