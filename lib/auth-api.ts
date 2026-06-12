import { api } from "./api"

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
  /** True once the active role's onboarding is completed or fully skipped. */
  onboarded: boolean
  /** Screen keys already onboarded for the active role, e.g. ["dashboard","careers"]. */
  onboardingDone: string[]
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
  /** Onboarding state for the active role (from /auth/me). */
  onboarded: boolean
  onboardingDone: string[]
  active: boolean
  profilePhoto: string | null
  createdAt: string
  updatedAt: string
}

// ── API calls ─────────────────────────────────────────────────────────────────

export interface SwitchRolePayload {
  userRoleId: number
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
}

// ── Multi-tenant company selection ──────────────────────────────────────────────
// gpr-auth owns companies. Login returns the user's companies; a multi-company user picks one
// (select-company re-mints the identity token with companyId) before the WorkOS session resolves
// roles within that company. switch-company changes tenant later.

export interface CompanyInfo {
  id: number
  name: string
  slug: string
}

export interface CompanyLoginResponse {
  requiresCompanySelection: boolean
  companies: CompanyInfo[]
  companyId: number | null
}

export const companyApi = {
  list: () => api.get<CompanyInfo[]>("/auth/companies").then((r) => r.data),
  select: (companyId: number) =>
    api
      .post<CompanyLoginResponse>("/auth/select-company", { companyId })
      .then((r) => r.data),
  switch: (companyId: number) =>
    api
      .post<CompanyLoginResponse>("/auth/switch-company", { companyId })
      .then((r) => r.data),
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", payload).then((r) => r.data),
  login: (payload: LoginPayload) =>
    api.post<CompanyLoginResponse>("/auth/login", payload).then((r) => r.data),
  // Role selection/switch live in WorkOS (wos-hr) under Option A — these mint the role token.
  selectRole: (payload: SelectRolePayload) =>
    api
      .post<AuthResponse>("/hr/auth/session/select-role", payload)
      .then((r) => r.data),
  switchRole: (payload: SwitchRolePayload) =>
    api.post<AuthResponse>("/hr/auth/switch-role", payload).then((r) => r.data),
  logout: () => api.post("/auth/logout"),
  // Profile (employee record + roles + onboarding) is resolved by WorkOS, not the identity service.
  me: () => api.get<MeResponse>("/hr/auth/me").then((r) => r.data),
  refresh: () => api.post("/auth/refresh"),
}

// ── WorkOS session (Phase 3, Option A) ──────────────────────────────────────────
// gpr-auth (/auth/*) authenticates identity; wos-hr (/hr/auth/*) resolves WorkOS roles and mints
// the role-bearing access token. Call sessionApi.establish() right after a successful /auth/login.

export interface SessionRolePayload {
  userRoleId: number
}

export const sessionApi = {
  /** Mint a WorkOS session from the identity token — returns role info or a role-selection prompt. */
  establish: () =>
    api.post<LoginResponse>("/hr/auth/session").then((r) => r.data),
  selectRole: (payload: SessionRolePayload) =>
    api
      .post<AuthResponse>("/hr/auth/session/select-role", payload)
      .then((r) => r.data),
  switchRole: (payload: SessionRolePayload) =>
    api.post<AuthResponse>("/hr/auth/switch-role", payload).then((r) => r.data),
}

// ── Onboarding ────────────────────────────────────────────────────────────────
// The active role is resolved server-side from the JWT, so these take no role id.

export const onboardingApi = {
  /** Mark one screen's tour completed/skipped for the active role. */
  completeScreen: (screenKey: string) =>
    api
      .post<AuthResponse>(`/hr/auth/onboarding/screen/${screenKey}/complete`)
      .then((r) => r.data),
  /** Skip all remaining onboarding for the active role. */
  skipAll: () =>
    api.post<AuthResponse>("/hr/auth/onboarding/skip-all").then((r) => r.data),
}
