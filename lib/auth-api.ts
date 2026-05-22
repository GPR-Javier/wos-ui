import { api } from "./axios"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvailableRole {
  id: number
  name: string
  description?: string
  isTemporary?: boolean
}

export interface AuthResponse {
  role: string
  userRoleNames: string[]
  authorities: string[]
  requiresRoleSelection: false
}

export interface RoleSelectionRequired {
  requiresRoleSelection: true
  availableRoles: AvailableRole[]
}

export type LoginResponse = AuthResponse | RoleSelectionRequired

export interface LoginPayload {
  email: string
  password: string
}

export interface SelectRolePayload {
  email: string
  password: string
  userRoleId: number
}

export interface MeResponse {
  id: number
  employeeId: string
  firstName: string
  lastName: string
  email: string
  role: string
  userRoleNames: string[]
  authorities: string[]
  active: boolean
  profilePhoto: string | null
  createdAt: string
  updatedAt: string
}

// ── API calls ─────────────────────────────────────────────────────────────────

export interface SwitchRolePayload {
  userRoleId: number
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>("/auth/login", payload).then((r) => r.data),
  selectRole: (payload: SelectRolePayload) =>
    api
      .post<AuthResponse>("/auth/login/select-role", payload)
      .then((r) => r.data),
  switchRole: (payload: SwitchRolePayload) =>
    api.post<AuthResponse>("/auth/switch-role", payload).then((r) => r.data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<MeResponse>("/auth/me").then((r) => r.data),
  refresh: () => api.post("/auth/refresh"),
}
