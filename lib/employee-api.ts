import { api } from "./axios"
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

export const employeeApi = {
  attendance: (params: { page?: number; size?: number } = {}) =>
    api
      .get<
        PageResponse<AttendanceEntry>
      >("/attendance/me", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  clockIn: () =>
    api.post<AttendanceEntry>("/attendance/clock-in").then((r) => r.data),

  clockOut: () =>
    api.post<AttendanceEntry>("/attendance/clock-out").then((r) => r.data),

  breakStart: (type: string) =>
    api
      .post<AttendanceEntry>("/attendance/break-start", { type })
      .then((r) => r.data),

  breakEnd: () =>
    api.post<AttendanceEntry>("/attendance/break-end").then((r) => r.data),

  attendanceHeatmap: () =>
    api.get<HeatmapEntry[]>("/attendance/me/heatmap").then((r) => r.data),

  payslips: (params: { page?: number; size?: number } = {}) =>
    api
      .get<
        PageResponse<PayslipEntry>
      >("/employee/payslips", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  stats: () => api.get<EmployeeStats>("/employee/stats").then((r) => r.data),

  profile: () =>
    api.get<EmployeeProfile>("/employee/profile").then((r) => r.data),

  leaveBalances: () =>
    api.get<LeaveBalance[]>("/employee/leave-balances").then((r) => r.data),
}
