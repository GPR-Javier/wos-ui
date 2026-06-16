import { api } from "./api"
import type { PageResponse } from "./admin-api"

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

  clockIn: () =>
    api.post<AttendanceEntry>("/hr/attendance/clock-in").then((r) => r.data),

  clockOut: () =>
    api.post<AttendanceEntry>("/hr/attendance/clock-out").then((r) => r.data),

  breakStart: (type: string) =>
    api
      .post<AttendanceEntry>("/hr/attendance/break-start", { type })
      .then((r) => r.data),

  breakEnd: () =>
    api.post<AttendanceEntry>("/hr/attendance/break-end").then((r) => r.data),

  attendanceHeatmap: () =>
    api.get<HeatmapEntry[]>("/hr/attendance/me/heatmap").then((r) => r.data),

  payslips: (params: { page?: number; size?: number } = {}) =>
    api
      .get<
        PageResponse<PayslipEntry>
      >("/hr/employee/payslips", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  stats: () => api.get<EmployeeStats>("/hr/employee/stats").then((r) => r.data),

  profile: () =>
    api.get<EmployeeProfile>("/hr/employee/profile").then((r) => r.data),

  leaveBalances: () =>
    api.get<LeaveBalance[]>("/hr/employee/leave-balances").then((r) => r.data),

  evaluations: () =>
    api
      .get<EmployeeEvaluation[]>("/hr/employee/evaluations")
      .then((r) => r.data),

  documents: () =>
    api.get<EmployeeDocument[]>("/hr/employee/documents").then((r) => r.data),
}
