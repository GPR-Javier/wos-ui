import { api } from "./api"

// Identity (gpr-auth) is shared across every app. Credentials + canonical personal info live here;
// editing them affects how the user signs in / the default profile in apps they haven't customized.
// The per-app profile (wos-hr) is a local snapshot — editing it stays in this app only.

export interface AccountSummary {
  id: number
  username: string
  email: string
  phone: string | null
  firstName: string | null
  lastName: string | null
  middleName: string | null
  birthday: string | null // "YYYY-MM-DD"
  address: string | null
  gender: string | null
}

export interface UpdateCredentialsPayload {
  email?: string
  username?: string
  phone?: string
  newPassword?: string
}

export interface UpdateInfoPayload {
  firstName?: string
  lastName?: string
  middleName?: string
  birthday?: string | null
  address?: string
  gender?: string
}

export interface UpdateProfilePayload {
  firstName?: string
  lastName?: string
  middleName?: string
  birthday?: string | null
  address?: string
}

/** Central identity — credentials + canonical info. SHARED across all apps (warn before saving). */
export const accountApi = {
  get: () => api.get<AccountSummary>("/auth/me").then((r) => r.data),
  updateCredentials: (payload: UpdateCredentialsPayload) =>
    api.put<AccountSummary>("/auth/me/credentials", payload).then((r) => r.data),
  updateInfo: (payload: UpdateInfoPayload) =>
    api.put<AccountSummary>("/auth/me/info", payload).then((r) => r.data),
}

/** Per-app profile — a local snapshot. Editing here NEVER touches gpr-auth / other apps. */
export const profileApi = {
  updateProfile: (payload: UpdateProfilePayload) =>
    api.put("/hr/auth/me/profile", payload).then((r) => r.data),
}
