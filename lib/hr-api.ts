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
  onLeave: number
  approvedLeave: number
  pendingLeave: number
  openRequests: number
  leaveRequests: number
  dtrRequests: number
}

export const hrApi = {
  employees: (params: { page?: number; size?: number; search?: string } = {}) =>
    api
      .get<
        PageResponse<HrEmployee>
      >("/hr/employees", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

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
