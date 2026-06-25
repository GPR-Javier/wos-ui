import { api } from "./api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserRoleAssignment {
  roleId: number
  roleName: string
  roleColor: string | null
  temporary?: boolean
  startAt?: string | null // ISO datetime "YYYY-MM-DDTHH:MM:SS"
  endAt?: string | null
}

export interface TempRoleAccessPayload {
  roleId: number
  startDate: string | null // "YYYY-MM-DD"
  endDate: string | null
  startTime: string | null // "HH:MM"
  endTime: string | null
}

export interface TempRoleAccessResponse {
  roleId: number
  roleName: string
  roleColor: string | null
  temporary: boolean
  startAt: string | null
  endAt: string | null
}

export interface AdminUser {
  id: number
  employeeId: string
  firstName: string
  lastName: string
  email: string
  profilePhoto: string | null
  role: string
  userRoles: UserRoleAssignment[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number // current page (0-indexed)
}

export interface ListUsersParams {
  page?: number
  size?: number
  role?: string // "EMPLOYEE" | "ADMIN" — omit for all
}

export interface CreateUserPayload {
  firstName: string
  lastName: string
  password: string
  userRoleIds: number[]
  /** Many-to-many: first entry becomes the primary position */
  jobPositionIds: number[]
}

export interface ActiveUserRole {
  id: number
  name: string
  description: string
  active: boolean
}

export interface AuditLog {
  id: number
  logCode: string
  user: string
  initials: string
  action: string
  target: string
  ip: string
  timestamp: string
  severity: "info" | "warning" | "critical"
}

export interface AdminStats {
  totalUsers: number
  activeSessions: number
  systemHealth: number
  criticalAlerts: number
}

export interface TeamAttendanceRecord {
  id: number
  userId: number
  employeeId: string
  firstName: string
  lastName: string
  date: string // YYYY-MM-DD
  day: string // "Mon", "Tue", ...
  timeIn: string | null // "hh:mm a"
  timeOut: string | null
  hoursWorked: string // "7h 30m" or "—"
  overtimeHours: string | null // "1h 30m" or null
  status: string // "present" | "late" | "absent" | "leave" | ...
  lateMinutes: number | null
  shift: string // "day" | "graveyard"
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const adminAttendanceApi = {
  team: (params: { date?: string; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<TeamAttendanceRecord>>("/hr/attendance/team", {
        params: { page: 0, size: 50, ...params },
      })
      .then((r) => r.data),
}

export const adminAuditApi = {
  list: (params: { page?: number; size?: number; search?: string } = {}) =>
    api
      .get<
        PageResponse<AuditLog>
      >("/auth/audit-logs", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),
}

export const adminStatsApi = {
  get: () => api.get<AdminStats>("/auth/stats").then((r) => r.data),
}

export const adminUsersApi = {
  list: (params: ListUsersParams = {}) =>
    api
      .get<
        PageResponse<AdminUser>
      >("/hr/users", { params: { page: 0, size: 20, ...params } })
      .then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    api.post<AdminUser>("/hr/users", payload).then((r) => r.data),

  listActiveUserRoles: () =>
    api.get<ActiveUserRole[]>("/hr/user-roles/active").then((r) => r.data),

  delete: (id: number) => api.delete(`/hr/users/${id}`),

  assignRoles: (id: number, userRoleIds: number[]) =>
    api
      .put<AdminUser>(`/hr/users/${id}/employee-roles`, {
        userRoleIds,
        employeeRoleIds: userRoleIds,
      })
      .then((r) => r.data),

  setTempRoleAccess: (
    userId: number,
    roleId: number,
    payload: TempRoleAccessPayload
  ) =>
    api
      .put<TempRoleAccessResponse>(
        `/hr/users/${userId}/employee-roles/${roleId}/temporary-access`,
        payload
      )
      .then((r) => r.data),
}
