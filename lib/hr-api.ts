import { api } from "./axios"
import type { PageResponse } from "./admin-api"

export interface HrEmployee {
  id: number
  employeeId: string
  firstName: string
  lastName: string
  email: string
  department: string
  position: string
  jobPositionId?: number | null
  jobPosition?: {
    id: number
    title: string
    level?: string | null
    department?: string | null
    salaryGrade?: {
      id: number
      code: string
      name?: string | null
      baseSalary: number
      minSalary: number
      maxSalary: number
    } | null
  } | null
  team?: string | null
  status: "active" | "on-leave" | "inactive"
  startDate: string
}

export interface LeaveRequest {
  id: number
  requestCode: string
  employeeName: string
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: "pending" | "approved" | "rejected"
  reason: string
  filedAt: string
}

export interface JobPosting {
  id: number
  jobCode: string
  title: string
  department: string
  location: string
  type: string
  salaryRange: string
  status: "new" | "urgent" | "open" | "closed"
  applicantsCount: number
  tags: string[]
}

export interface HrStats {
  totalEmployees: number
  presentToday: number
  attendanceRate: number
  lateToday: number
  onLeave: number
  approvedLeave: number
  pendingLeave: number
  openRequests: number
  pendingRequests: number
  leaveRequests: number
  dtrRequests: number
  otHoursToday: number   // total OT hours across team today (decimal, e.g. 12.5)
}

export const hrApi = {
  employees: (params: { page?: number; size?: number; search?: string } = {}) =>
    api
      .get<
        PageResponse<HrEmployee>
      >("/hr/employees", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  employee: (id: number) =>
    api.get<HrEmployee>(`/hr/employees/${id}`).then((r) => r.data),

  updateEmployee: (id: number, payload: { jobPositionId?: number | null; department?: string; position?: string; team?: string | null }) =>
    api.patch<HrEmployee>(`/hr/employees/${id}`, payload).then((r) => r.data),

  leaveRequests: (
    params: { page?: number; size?: number; status?: string } = {}
  ) =>
    api
      .get<
        PageResponse<LeaveRequest>
      >("/leave-requests", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  approveLeave: (id: number) =>
    api.post(`/leave-requests/${id}/approve`).then((r) => r.data),

  rejectLeave: (id: number) =>
    api.post(`/leave-requests/${id}/reject`).then((r) => r.data),

  jobs: (params: { page?: number; size?: number } = {}) =>
    api
      .get<
        PageResponse<JobPosting>
      >("/hr/jobs", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  stats: () => api.get<HrStats>("/hr/stats").then((r) => r.data),
}
