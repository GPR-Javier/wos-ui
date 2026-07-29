import { api } from "./api"

export type FaceEnrollmentStatus = "ACTIVE" | "REVOKED"

/** My Face ID enrollment status — the raw descriptors are never returned by the backend. */
export interface FaceEnrollmentStatusResponse {
  enrolled: boolean
  status: FaceEnrollmentStatus | null
  templateCount: number
  modelVersion: string | null
  thumbnailUrl: string | null
  consentAt: string | null
  enrolledAt: string | null
}

/**
 * `APPEND` adds the descriptors to the existing gallery — used to register an alternate
 * appearance (glasses, beard, different lighting) without discarding the first enrollment.
 * Omitted means `REPLACE`.
 */
export type EnrollMode = "REPLACE" | "APPEND"

export interface EnrollFacePayload {
  /** One 128-float descriptor vector per captured frame. */
  descriptors: number[][]
  /** Optional small reference-image data URL for the enrolled face. */
  thumbnail?: string
  /** face-api model identifier the descriptors were produced with. */
  modelVersion?: string
  /** Explicit consent to store the biometric template — must be true. */
  consent: boolean
  /** Defaults to `REPLACE` server-side when omitted. */
  mode?: EnrollMode
}

/**
 * One row of the admin roster. Metadata only — descriptors and the reference thumbnail stay on
 * the server, so an admin can see whether someone is enrolled without seeing their face data.
 */
export interface FaceEnrollmentAdminRow {
  userId: number
  name: string | null
  email: string | null
  /** Their role grants BIOMETRICS:ENROLL_FACE — i.e. a face match gates their clock-in/out. */
  faceRequired: boolean
  enrolled: boolean
  status: FaceEnrollmentStatus | null
  templateCount: number
  modelVersion: string | null
  enrolledAt: string | null
}

export const biometricApi = {
  getMyFace: () =>
    api
      .get<FaceEnrollmentStatusResponse>("/hr/biometrics/face/me")
      .then((r) => r.data),

  enrollFace: (body: EnrollFacePayload) =>
    api
      .post<FaceEnrollmentStatusResponse>("/hr/biometrics/face/me/enroll", body)
      .then((r) => r.data),

  removeFace: () => api.delete("/hr/biometrics/face/me").then((r) => r.data),

  // ── Admin (BIOMETRICS_MANAGEMENT) ────────────────────────────────────────────

  /** Every employee in the company with their enrollment state, never-enrolled included. */
  listEnrollments: () =>
    api
      .get<FaceEnrollmentAdminRow[]>("/hr/biometrics/face/admin")
      .then((r) => r.data),

  /** Clear one employee's enrollment so they can enroll again — the lockout recovery path. */
  resetEnrollment: (userId: number) =>
    api.delete(`/hr/biometrics/face/admin/${userId}`).then((r) => r.data),
}
