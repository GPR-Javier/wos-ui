import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the axios `api` instance — every method resolves with a canned axios-like response.
vi.mock("@/lib/api", () => {
  const api = {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: undefined })),
  }
  return { api }
})

import { api } from "@/lib/api"
import {
  overtimeApi,
  OT_TYPE_LABEL,
  OT_RATE_MULTIPLIER,
  OT_TYPE_COLOR,
  OT_STATUS_LABEL,
  OT_STATUS_VARIANT,
  otQueue,
  canSubmitClaim,
  calcHours,
  type CreateOvertimePayload,
  type AuthorizeOvertimePayload,
  type BulkAuthorizePayload,
  type ClaimOvertimePayload,
} from "@/lib/overtime-api"

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

/** Deep-scan any value for a `companyId` key — the client must never leak one. */
function containsCompanyId(value: unknown): boolean {
  if (value == null || typeof value !== "object") return false
  if (Object.prototype.hasOwnProperty.call(value, "companyId")) return true
  return Object.values(value as Record<string, unknown>).some(containsCompanyId)
}

const createBody: CreateOvertimePayload = {
  overtimeDate: "2026-07-10",
  startTime: "18:00",
  endTime: "20:00",
  overtimeType: "REGULAR",
  reason: "Sprint crunch",
  isDraft: false,
}

const authBody: AuthorizeOvertimePayload = {
  overtimeDate: "2026-07-10",
  plannedStartTime: "18:00",
  plannedEndTime: "20:00",
  reason: "Planned release",
  isDraft: false,
}

const bulkBody: BulkAuthorizePayload = {
  overtimeDate: "2026-07-10",
  plannedStartTime: "18:00",
  plannedEndTime: "20:00",
  reason: "Team crunch",
  userIds: [1, 2, 3],
}

const claimBody: ClaimOvertimePayload = {
  startTime: "18:00",
  endTime: "20:30",
  reason: "Ran a bit over",
}

describe("overtimeApi client — employee endpoints", () => {
  beforeEach(() => vi.clearAllMocks())

  it("createMine POSTs to /hr/overtime-requests with the payload body", async () => {
    await overtimeApi.createMine(createBody)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests",
      createBody
    )
  })

  it("listMine GETs /hr/overtime-requests/me with default + merged params", async () => {
    await overtimeApi.listMine({
      status: "PENDING_AUTH",
      from: "2026-01-01",
      to: "2026-12-31",
    })
    expect(mockApi.get).toHaveBeenCalledWith("/hr/overtime-requests/me", {
      params: {
        page: 0,
        size: 20,
        status: "PENDING_AUTH",
        from: "2026-01-01",
        to: "2026-12-31",
      },
    })
  })

  it("listMine defaults to just {page:0,size:20} when called with no params", async () => {
    await overtimeApi.listMine()
    expect(mockApi.get).toHaveBeenCalledWith("/hr/overtime-requests/me", {
      params: { page: 0, size: 20 },
    })
  })

  it("submitDraft POSTs to /hr/overtime-requests/{id}/submit", async () => {
    await overtimeApi.submitDraft(3)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/overtime-requests/3/submit")
  })

  it("cancelMine POSTs to /hr/overtime-requests/{id}/cancel", async () => {
    await overtimeApi.cancelMine(5)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/overtime-requests/5/cancel")
  })

  it("createAuthorization POSTs to /hr/overtime-requests/authorizations", async () => {
    await overtimeApi.createAuthorization(authBody)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/authorizations",
      authBody
    )
  })

  it("decline POSTs to /hr/overtime-requests/{id}/decline with reason (null default)", async () => {
    await overtimeApi.decline(9)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/9/decline",
      { reason: null }
    )
    mockApi.post.mockClear()
    await overtimeApi.decline(9, "changed my mind")
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/9/decline",
      { reason: "changed my mind" }
    )
  })

  it("resubmit POSTs to /hr/overtime-requests/{id}/resubmit", async () => {
    await overtimeApi.resubmit(4)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/4/resubmit"
    )
  })

  it("submitClaim POSTs to /hr/overtime-requests/{id}/claim with the body", async () => {
    await overtimeApi.submitClaim(7, claimBody)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/7/claim",
      claimBody
    )
  })

  it("createEmergency POSTs to /hr/overtime-requests/emergency", async () => {
    await overtimeApi.createEmergency(createBody)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/emergency",
      createBody
    )
  })
})

describe("overtimeApi client — admin / review endpoints", () => {
  beforeEach(() => vi.clearAllMocks())

  it("listAll GETs /hr/overtime-requests with {status,search,from,to,page,size}", async () => {
    await overtimeApi.listAll({
      status: "APPROVED",
      search: "jane",
      from: "2026-01-01",
      to: "2026-06-30",
      page: 2,
      size: 50,
    })
    expect(mockApi.get).toHaveBeenCalledWith("/hr/overtime-requests", {
      params: {
        page: 2,
        size: 50,
        status: "APPROVED",
        search: "jane",
        from: "2026-01-01",
        to: "2026-06-30",
      },
    })
  })

  it("listAll defaults to just {page:0,size:20} when called with no params", async () => {
    await overtimeApi.listAll()
    expect(mockApi.get).toHaveBeenCalledWith("/hr/overtime-requests", {
      params: { page: 0, size: 20 },
    })
  })

  it("approve POSTs .../{id}/approve with reviewNote (null default)", async () => {
    await overtimeApi.approve(9)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/9/approve",
      { reviewNote: null }
    )
    mockApi.post.mockClear()
    await overtimeApi.approve(9, "good")
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/9/approve",
      { reviewNote: "good" }
    )
  })

  it("reject POSTs .../{id}/reject with reviewNote (null default)", async () => {
    await overtimeApi.reject(11)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/11/reject",
      { reviewNote: null }
    )
  })

  it("bulkAuthorize POSTs to /hr/overtime-requests/authorizations/bulk", async () => {
    await overtimeApi.bulkAuthorize(bulkBody)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/authorizations/bulk",
      bulkBody
    )
  })

  it("authorize POSTs .../{id}/authorize with reviewNote (null default)", async () => {
    await overtimeApi.authorize(1)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/1/authorize",
      { reviewNote: null }
    )
    mockApi.post.mockClear()
    await overtimeApi.authorize(1, "ok")
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/1/authorize",
      { reviewNote: "ok" }
    )
  })

  it("rejectAuthorization POSTs .../{id}/authorize/reject with reviewNote (null default)", async () => {
    await overtimeApi.rejectAuthorization(2)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/2/authorize/reject",
      { reviewNote: null }
    )
  })

  it("returnAuthorization POSTs .../{id}/authorize/return with { reviewNote }", async () => {
    await overtimeApi.returnAuthorization(3, "fix the window")
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/3/authorize/return",
      { reviewNote: "fix the window" }
    )
  })

  it("approveClaim POSTs .../{id}/claim/approve with reviewNote (null default)", async () => {
    await overtimeApi.approveClaim(4)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/4/claim/approve",
      { reviewNote: null }
    )
    mockApi.post.mockClear()
    await overtimeApi.approveClaim(4, "approved")
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/4/claim/approve",
      { reviewNote: "approved" }
    )
  })

  it("rejectClaim POSTs .../{id}/claim/reject with reviewNote (null default)", async () => {
    await overtimeApi.rejectClaim(5)
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/5/claim/reject",
      { reviewNote: null }
    )
  })

  it("returnClaim POSTs .../{id}/claim/return with { reviewNote }", async () => {
    await overtimeApi.returnClaim(6, "recheck hours")
    expect(mockApi.post).toHaveBeenCalledWith(
      "/hr/overtime-requests/6/claim/return",
      { reviewNote: "recheck hours" }
    )
  })

  it("never sends a companyId on any call", async () => {
    await overtimeApi.createMine(createBody)
    await overtimeApi.createAuthorization(authBody)
    await overtimeApi.bulkAuthorize(bulkBody)
    await overtimeApi.submitClaim(1, claimBody)
    await overtimeApi.approve(1, "ok")
    await overtimeApi.reject(1, "no")
    await overtimeApi.authorize(1, "ok")
    await overtimeApi.returnAuthorization(1, "revise")
    await overtimeApi.returnClaim(1, "revise")
    await overtimeApi.listMine({ status: "PENDING_AUTH" })
    await overtimeApi.listAll({ search: "x" })

    const allArgs = [
      ...mockApi.post.mock.calls,
      ...mockApi.put.mock.calls,
      ...mockApi.get.mock.calls,
      ...mockApi.delete.mock.calls,
    ].flat()
    expect(allArgs.some(containsCompanyId)).toBe(false)
  })
})

describe("overtime label / rate maps", () => {
  it("exposes a label, multiplier, color and status metadata for every enum value", () => {
    expect(OT_TYPE_LABEL.REGULAR).toBe("Regular OT")
    expect(OT_TYPE_LABEL.EMERGENCY).toBe("Emergency OT")
    expect(OT_RATE_MULTIPLIER.REGULAR).toBe(1.25)
    expect(OT_RATE_MULTIPLIER.REGULAR_HOLIDAY).toBe(2.0)
    expect(OT_TYPE_COLOR.REGULAR).toBe("blue")
    expect(OT_TYPE_COLOR.REST_DAY).toBe("amber")
    expect(OT_TYPE_COLOR.REST_DAY_OT).toBe("red")
    expect(OT_TYPE_COLOR.REGULAR_HOLIDAY).toBe("purple")
    expect(OT_STATUS_LABEL.PENDING_AUTH).toBe("Pending authorization")
    expect(OT_STATUS_LABEL.PENDING).toBe("Pending")
    expect(OT_STATUS_VARIANT.APPROVED).toBe("green")
    expect(OT_STATUS_VARIANT.AUTHORIZED).toBe("blue")
    expect(OT_STATUS_VARIANT.DRAFT).toBe("gray")
  })
})

describe("otQueue", () => {
  it("routes PENDING_AUTH to the authorization queue", () => {
    expect(otQueue("PENDING_AUTH")).toBe("authorization")
  })
  it("routes PENDING_CLAIM and PENDING_EMERGENCY_CLAIM to the claim queue", () => {
    expect(otQueue("PENDING_CLAIM")).toBe("claim")
    expect(otQueue("PENDING_EMERGENCY_CLAIM")).toBe("claim")
  })
  it("routes anything else to none", () => {
    expect(otQueue("APPROVED")).toBe("none")
    expect(otQueue("DRAFT")).toBe("none")
  })
})

describe("canSubmitClaim", () => {
  it("is true only for an AUTHORIZED request", () => {
    expect(canSubmitClaim("AUTHORIZED")).toBe(true)
    expect(canSubmitClaim("PENDING_AUTH")).toBe(false)
    expect(canSubmitClaim("APPROVED")).toBe(false)
  })
})

describe("calcHours", () => {
  it("returns 0 when either bound is missing", () => {
    expect(calcHours("", "20:00")).toBe(0)
    expect(calcHours("18:00", "")).toBe(0)
  })
  it("computes decimal hours for a same-day range", () => {
    expect(calcHours("18:00", "20:30")).toBe(2.5)
  })
  it("wraps a range that crosses midnight", () => {
    expect(calcHours("22:00", "02:00")).toBe(4)
  })
})
