import { api } from "./api"

// Identity-level profile data — owned by gpr-auth (gpr_identity DB), shared across apps.
// Served under /api/auth/me/* and scoped to the authenticated identity.

export interface Education {
  id: number
  school: string
  degree: string
  fieldOfStudy: string | null
  startDate: string | null // "YYYY-MM-DD"
  endDate: string | null // null = ongoing
  honor: string | null
  description: string | null
}

export interface EducationPayload {
  school: string
  degree: string
  fieldOfStudy?: string | null
  startDate?: string | null
  endDate?: string | null
  honor?: string | null
  description?: string | null
}

export interface WorkExperience {
  id: number
  title: string
  company: string
  employmentType: string | null
  location: string | null
  startDate: string | null // "YYYY-MM-DD"
  endDate: string | null // null = current
  description: string | null
}

export interface WorkExperiencePayload {
  title: string
  company: string
  employmentType?: string | null
  location?: string | null
  startDate?: string | null
  endDate?: string | null
  description?: string | null
}

export interface Certificate {
  id: number
  name: string
  issuer: string
  issuedDate: string | null // "YYYY-MM-DD"
  expiryDate: string | null // null = no expiry
  credentialId: string | null
  credentialUrl: string | null
}

export interface CertificatePayload {
  name: string
  issuer: string
  issuedDate?: string | null
  expiryDate?: string | null
  credentialId?: string | null
  credentialUrl?: string | null
}

export interface IdentitySummary {
  id: number
  username: string
  email: string
  phone: string | null
  firstName: string | null
  lastName: string | null
  middleName: string | null
  birthday: string | null
  address: string | null
  gender: string | null
  displayName: string | null
  bio: string | null
  profilePhoto: string | null
}

export interface UpdateInfoPayload {
  firstName?: string | null
  lastName?: string | null
  middleName?: string | null
  birthday?: string | null
  address?: string | null
  gender?: string | null
  displayName?: string | null
  bio?: string | null
  profilePhoto?: string | null
}

export interface LoginMethods {
  email: string
  hasPassword: boolean
  providers: string[] // connected OAuth provider keys, e.g. ["google"]
}

export interface UpdateCredentialsPayload {
  email?: string
  username?: string
  phone?: string | null
  newPassword?: string
}

export const identityProfileApi = {
  // Account / canonical info (shared identity)
  getMe: () => api.get<IdentitySummary>("/auth/me").then((r) => r.data),
  updateInfo: (payload: UpdateInfoPayload) =>
    api.put<IdentitySummary>("/auth/me/info", payload).then((r) => r.data),
  updateCredentials: (payload: UpdateCredentialsPayload) =>
    api
      .put<IdentitySummary>("/auth/me/credentials", payload)
      .then((r) => r.data),

  /** Permanently delete the signed-in identity. `confirm` must equal the account email/username. */
  deleteAccount: (confirm: string) =>
    api.delete("/auth/me", { data: { confirm } }).then((r) => r.data),

  /** The signed-in identity's login methods (password + linked OAuth providers). */
  loginMethods: () =>
    api.get<LoginMethods>("/auth/me/login-methods").then((r) => r.data),

  /** Disconnect a linked OAuth provider. */
  removeLoginMethod: (provider: string) =>
    api.delete(`/auth/me/login-methods/${provider}`),

  /** Set (first time) or change the password. Omit currentPassword when setting one initially. */
  changePassword: (payload: { currentPassword?: string; newPassword: string }) =>
    api.put("/auth/me/password", payload).then((r) => r.data),

  // Education
  listEducation: () =>
    api.get<Education[]>("/auth/me/education").then((r) => r.data),
  createEducation: (payload: EducationPayload) =>
    api.post<Education>("/auth/me/education", payload).then((r) => r.data),
  updateEducation: (id: number, payload: EducationPayload) =>
    api.put<Education>(`/auth/me/education/${id}`, payload).then((r) => r.data),
  deleteEducation: (id: number) => api.delete(`/auth/me/education/${id}`),

  // Work experience
  listWork: () =>
    api.get<WorkExperience[]>("/auth/me/work-experience").then((r) => r.data),
  createWork: (payload: WorkExperiencePayload) =>
    api
      .post<WorkExperience>("/auth/me/work-experience", payload)
      .then((r) => r.data),
  updateWork: (id: number, payload: WorkExperiencePayload) =>
    api
      .put<WorkExperience>(`/auth/me/work-experience/${id}`, payload)
      .then((r) => r.data),
  deleteWork: (id: number) => api.delete(`/auth/me/work-experience/${id}`),

  // Certificates
  listCertificates: () =>
    api.get<Certificate[]>("/auth/me/certificates").then((r) => r.data),
  createCertificate: (payload: CertificatePayload) =>
    api.post<Certificate>("/auth/me/certificates", payload).then((r) => r.data),
  updateCertificate: (id: number, payload: CertificatePayload) =>
    api
      .put<Certificate>(`/auth/me/certificates/${id}`, payload)
      .then((r) => r.data),
  deleteCertificate: (id: number) => api.delete(`/auth/me/certificates/${id}`),
}
