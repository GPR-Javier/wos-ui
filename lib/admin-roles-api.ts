import { api } from "./api"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FunctionalityDef {
  id: number
  name: string
  controlType?: "employee" | "admin" | "applicant"
}

export interface AccessRole {
  id: number
  name?: string
  pageName?: string
  code?: string
  pageCode?: string
  navGroup?: string
  functionalities: FunctionalityDef[]
}

export interface AssignedFunctionality {
  id: number
  functionalityId: number
  name: string
  enabled: boolean
  controlType?: "employee" | "admin" | "applicant"
}

export interface AssignedAccessRole {
  accessRoleId: number
  name: string
  functionalities: AssignedFunctionality[]
  startDate?: string | null // ISO date "YYYY-MM-DD"
  endDate?: string | null
  startTime?: string | null // "HH:MM" 24h
  endTime?: string | null
}

export interface TemporaryAccessPayload {
  startDate: string | null
  endDate: string | null
  startTime: string | null
  endTime: string | null
}

export interface UserRole {
  id: number
  name: string
  description: string
  color?: string
  roleType: "ADMIN" | "EMPLOYEE" | "APPLICANT"
  accessRoles: AssignedAccessRole[]
}

export interface UserRolePayload {
  name: string
  description: string
  color?: string
  roleType: "ADMIN" | "EMPLOYEE"
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const adminRolesApi = {
  // User Roles CRUD
  listUserRoles: () =>
    api.get<UserRole[]>("/hr/user-roles").then((r) => r.data),

  createUserRole: (payload: UserRolePayload) =>
    api.post<UserRole>("/hr/user-roles", payload).then((r) => r.data),

  updateUserRole: (id: number, payload: UserRolePayload) =>
    api.put<UserRole>(`/hr/user-roles/${id}`, payload).then((r) => r.data),

  deleteUserRole: (id: number) => api.delete(`/hr/user-roles/${id}`),

  // Access Roles assignment
  addAccessRole: (userRoleId: number, accessRoleId: number) =>
    api
      .post(`/hr/user-roles/${userRoleId}/access-roles`, { accessRoleId })
      .then((r) => r.data),

  removeAccessRole: (userRoleId: number, accessRoleId: number) =>
    api.delete(`/hr/user-roles/${userRoleId}/access-roles/${accessRoleId}`),

  // Temporary access
  setTemporaryAccess: (
    userRoleId: number,
    accessRoleId: number,
    payload: TemporaryAccessPayload
  ) =>
    api
      .put(
        `/hr/user-roles/${userRoleId}/access-roles/${accessRoleId}/temporary-access`,
        payload
      )
      .then((r) => r.data),

  // Functionality toggles
  toggleFunctionality: (
    userRoleId: number,
    accessRoleId: number,
    functionalityId: number,
    enabled: boolean
  ) =>
    api
      .put(
        `/hr/user-roles/${userRoleId}/access-roles/${accessRoleId}/functionalities/${functionalityId}`,
        { enabled }
      )
      .then((r) => r.data),

  // Available access roles (for the permission matrix)
  listAccessRoles: () =>
    api.get<AccessRole[]>("/hr/access-roles").then((r) => r.data),
}
