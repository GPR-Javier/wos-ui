import { publicApi } from "./api"

/**
 * Shared-terminal ("Quick Time In / Out") punching from the login page. Unauthenticated by design —
 * the employee's face is the credential, matched server-side before any attendance row is written.
 *
 * Uses `publicApi` rather than `api`: there is no session here, and a 401 must never trigger the
 * refresh-and-redirect flow that would bounce a kiosk to the login screen mid-punch.
 */

export interface KioskCompanyChoice {
  companyId: number
  name: string
}

export interface KioskLookupResponse {
  /** Opaque, short-lived, single-use. The only way to reach the punch step. Absent while choosing. */
  handle: string | null
  /** Masked ("Gene J.") so the terminal can confirm the person without exposing a directory. */
  displayName: string
  /**
   * Whether this employment's role demands a face scan. Advisory — the server re-decides from the
   * handle at punch time, so skipping the scanner client-side can't skip verification.
   */
  requiresFace: boolean
  /** The identifier matched employments at more than one company — ask, then look up again. */
  requiresCompanySelection: boolean
  companies: KioskCompanyChoice[] | null
}

export interface KioskPunchResponse {
  type: "in" | "out"
  /** Server-recorded ISO timestamp — never a browser clock. */
  at: string | null
  displayName: string
}

export const kioskApi = {
  /**
   * Step 1 — resolve an employee number, username or email. Not company-scoped: the terminal can
   * sit on the company-less login page, so resolution spans employers. Pass `companyId` on the
   * second call once the employee has picked one.
   */
  lookup: (identifier: string, companyId?: number) =>
    publicApi
      .post<KioskLookupResponse>("/hr/attendance/kiosk/lookup", {
        identifier,
        companyId,
      })
      .then((r) => r.data),

  /** Step 2 — spend the handle with a live descriptor and record the punch. */
  punch: (body: {
    handle: string
    type: "in" | "out"
    /** Omitted when the role has no Face ID; the server enforces whether it was needed. */
    faceDescriptor?: number[]
  }) =>
    publicApi
      .post<KioskPunchResponse>("/hr/attendance/kiosk/punch", body)
      .then((r) => r.data),
}
