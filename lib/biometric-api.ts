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

export const biometricApi = {
  getMyFace: () =>
    api
      .get<FaceEnrollmentStatusResponse>("/hr/biometrics/face/me")
      .then((r) => r.data),

  enrollFace: (body: EnrollFacePayload) =>
    api
      .post<FaceEnrollmentStatusResponse>("/hr/biometrics/face/me/enroll", body)
      .then((r) => r.data),

  removeFace: () =>
    api.delete("/hr/biometrics/face/me").then((r) => r.data),
}
