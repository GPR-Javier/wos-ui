import { api } from "./api"
import type { PageResponse } from "./admin-api"
import type { PayslipRecord } from "./payslip-figures"

export interface AttendanceBreakEntry {
  id: number
  type: string
  startedAt: string
  endedAt: string | null
}

export interface HeatmapEntry {
  date: string // YYYY-MM-DD
  status: string | null
}

export interface AttendanceEntry {
  id?: number
  date: string
  day: string
  timeIn: string
  timeOut: string
  hoursWorked: string
  rdHours?: string
  otHours: string
  status:
    | "present"
    | "late"
    | "absent"
    | "leave"
    | "holiday"
    | "restday"
    | "overtime"
    | "overbreak"
    | "undertime"
  lateMinutes?: number | null
  policySnapshot?: { earliestClockIn?: string | null } | null
  breaks?: AttendanceBreakEntry[]
}

/**
 * The employee payslip view's shape: pre-formatted display strings, with "—" where a figure
 * doesn't apply.
 *
 * <p>`/payroll/payslips/me` returns the raw Payslip entity (numbers, `basicSalary`/`grossPay`/…),
 * so {@link toPayslipEntry} adapts it. The two never matched — every field here was `undefined` at
 * runtime — but nothing noticed until an employee actually had a released payslip, at which point
 * the page crashed on `basic.replace`.
 */
export interface PayslipEntry {
  period: string
  basic: string
  otHrs: string
  ot: string
  gross: string
  sss: string
  philhealth: string
  pagibig: string
  tax: string
  deductions: string
  net: string
  released: string
  status: "released" | "upcoming"
  /**
   * The untouched record. The summary strings above cover only the statutory lines, so anything
   * needing the complete picture — the full payslip view, which renders through the company's
   * template — reads this instead of trying to reconstruct it from formatted text.
   */
  raw: PayslipRecord
}

/** The raw payslip entity as wos-payroll serialises it. */
type RawPayslip = PayslipRecord

const peso = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Zero reads as "doesn't apply" for optional lines — the view hides a row showing "—". */
const pesoOrDash = (n: number | null | undefined) => (!n ? "—" : peso(n))

export function toPayslipEntry(p: RawPayslip): PayslipEntry {
  const otHours = (p.overtimeBreakdown ?? []).reduce(
    (t, l) => t + (l.hours ?? 0),
    0
  )
  return {
    period:
      p.payrollRun?.period ?? `${p.periodStart ?? ""} – ${p.periodEnd ?? ""}`,
    basic: peso(p.basicSalary),
    otHrs: otHours > 0 ? String(otHours) : "—",
    ot: pesoOrDash(p.overtimePay),
    gross: peso(p.grossPay),
    sss: peso(p.sss),
    philhealth: peso(p.philhealth),
    pagibig: peso(p.pagibig),
    tax: peso(p.tax),
    deductions: peso(p.totalDeductions),
    net: peso(p.netPay),
    released: p.releasedAt ?? "",
    status: p.status === "released" ? "released" : "upcoming",
    raw: p,
  }
}

export interface EmployeeStats {
  totalDaysPresent: number
  totalLeaveUsed: number
  leaveVacation: number
  leaveSick: number
  totalHoursWorked: number
  totalHoursLate: number
  lateIncidents: number
}

export interface EmployeeProfile {
  firstName: string
  lastName: string
  email: string
  employeeId: string
  phone: string
  address: string
  department: string
  position: string
  team: string
  manager: string
  startDate: string
}

export interface LeaveBalance {
  type: string
  total: number
  used: number
  pending: number
  remaining: number
}

export interface EmployeeEvaluation {
  period: string
  reviewer: string
  date: string
  rating: number | null
  completed: boolean
}

export interface EmployeeDocument {
  id: number
  name: string
  category: string | null
  uploadedAt: string
}

export const employeeApi = {
  attendance: (params: { page?: number; size?: number } = {}) =>
    api
      .get<
        PageResponse<AttendanceEntry>
      >("/hr/attendance/me", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  // `faceDescriptor` is required only for roles gated on face verification; wos-hr matches it
  // against the enrolled gallery and refuses the punch on mismatch. When one is sent the global
  // error toast is suppressed — the verification modal shows the rejection inline instead.
  clockIn: (faceDescriptor?: number[]) =>
    api
      .post<AttendanceEntry>(
        "/hr/attendance/clock-in",
        { faceDescriptor },
        { skipErrorToast: !!faceDescriptor }
      )
      .then((r) => r.data),

  clockOut: (faceDescriptor?: number[]) =>
    api
      .post<AttendanceEntry>(
        "/hr/attendance/clock-out",
        { faceDescriptor },
        { skipErrorToast: !!faceDescriptor }
      )
      .then((r) => r.data),

  breakStart: (type: string) =>
    api
      .post<AttendanceEntry>("/hr/attendance/break-start", { type })
      .then((r) => r.data),

  breakEnd: () =>
    api.post<AttendanceEntry>("/hr/attendance/break-end").then((r) => r.data),

  attendanceHeatmap: () =>
    api.get<HeatmapEntry[]>("/hr/attendance/me/heatmap").then((r) => r.data),

  // Payslips are owned by wos-payroll, not wos-hr — the old /hr/employee/payslips path had no
  // handler at all, and wos-hr's catch-all exception handler turned that into a 500 rather than a
  // 404. `/payroll/payslips/me` is scoped to the caller and returns released runs only.
  payslips: (params: { page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<RawPayslip>>("/payroll/payslips/me", {
        params: { page: 0, size: 20, ...params },
      })
      // Adapt the entity to the view's shape here rather than in the component, so one place
      // owns the mapping and a backend field rename fails at the boundary instead of at render.
      .then((r) => ({
        ...r.data,
        content: r.data.content.map(toPayslipEntry),
      })),

  stats: () => api.get<EmployeeStats>("/hr/employee/stats").then((r) => r.data),

  // A missing employee profile is expected for applicants/guests (no WorkOS employment record),
  // so it degrades gracefully instead of surfacing the global error toast.
  profile: () =>
    api
      .get<EmployeeProfile>("/hr/employee/profile", { skipErrorToast: true })
      .then((r) => r.data),

  leaveBalances: () =>
    api.get<LeaveBalance[]>("/hr/employee/leave-balances").then((r) => r.data),

  evaluations: () =>
    api
      .get<EmployeeEvaluation[]>("/hr/employee/evaluations")
      .then((r) => r.data),

  documents: () =>
    api.get<EmployeeDocument[]>("/hr/employee/documents").then((r) => r.data),
}
