import { api, publicApi } from "./api"
import type { PageResponse } from "./admin-api"
import type { AssessmentPartType } from "./assessment-api"

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
      name?: string | null
      salaryAmount: number
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

export type WorkType = "remote" | "hybrid" | "onsite"
export type SalaryPeriod =
  | "hourly"
  | "weekly"
  | "semi-monthly"
  | "monthly"
  | "fixed-price"

export interface JobPosting {
  id: number
  jobCode: string
  title: string
  department: string
  location?: string | null
  type: string
  workType: WorkType
  description?: string | null
  salaryCurrency?: string | null
  salaryFrom?: number | null
  salaryTo?: number | null
  salaryPeriod?: SalaryPeriod | null
  salaryGradeFromId?: number | null
  salaryGradeFromName?: string | null
  salaryGradeToId?: number | null
  salaryGradeToName?: string | null
  status: "new" | "urgent" | "open" | "closed"
  /** Days a rejected candidate must wait before reapplying. null/0 = no cooldown. */
  reapplyCooldownDays?: number | null
  applicantsCount: number
  tags: string[]
  /** Pipeline stages enabled for this posting; null/absent = all template stages. */
  enabledStages?: AssessmentPartType[] | null
  /** UserRole an applicant is converted into when hired for this posting. */
  hireUserRoleId?: number | null
  hireUserRoleName?: string | null
  /** JobPosition this posting recruits for; seeds the offer/contract. */
  jobPositionId?: number | null
  jobPositionTitle?: string | null
}

export interface CreateJobPayload {
  title: string
  department: string
  location?: string | null
  type: string
  workType: WorkType
  description?: string | null
  salaryCurrency?: string | null
  salaryFrom?: number | null
  salaryTo?: number | null
  salaryPeriod?: SalaryPeriod | null
  salaryGradeFromId?: number | null
  salaryGradeToId?: number | null
  status: "new" | "urgent" | "open" | "closed"
  reapplyCooldownDays?: number | null
  tags: string[]
  enabledStages?: AssessmentPartType[] | null
  hireUserRoleId?: number | null
  jobPositionId?: number | null
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
  otHoursToday: number // total OT hours across team today (decimal, e.g. 12.5)
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

  updateEmployee: (
    id: number,
    payload: {
      jobPositionId?: number | null
      department?: string
      position?: string
      team?: string | null
    }
  ) =>
    api.patch<HrEmployee>(`/hr/employees/${id}`, payload).then((r) => r.data),

  leaveRequests: (
    params: { page?: number; size?: number; status?: string } = {}
  ) =>
    api
      .get<
        PageResponse<LeaveRequest>
      >("/hr/leave-requests", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  approveLeave: (id: number) =>
    api.post(`/hr/leave-requests/${id}/approve`).then((r) => r.data),

  rejectLeave: (id: number) =>
    api.post(`/hr/leave-requests/${id}/reject`).then((r) => r.data),

  jobs: (params: { page?: number; size?: number } = {}) =>
    api
      .get<
        PageResponse<JobPosting>
      >("/hr/jobs", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  /** Public — no auth required, no 401 redirect. Used on the careers page. */
  publicJobs: (params: { page?: number; size?: number } = {}) =>
    publicApi
      .get<
        PageResponse<JobPosting>
      >("/hr/jobs", { params: { page: 0, size: 50, ...params } })
      .then((r) => r.data),

  createJob: (payload: CreateJobPayload) =>
    api.post<JobPosting>("/hr/jobs", payload).then((r) => r.data),

  updateJob: (id: number, payload: Partial<CreateJobPayload>) =>
    api.put<JobPosting>(`/hr/jobs/${id}`, payload).then((r) => r.data),

  deleteJob: (id: number) => api.delete(`/hr/jobs/${id}`),

  stats: () => api.get<HrStats>("/hr/stats").then((r) => r.data),
}
