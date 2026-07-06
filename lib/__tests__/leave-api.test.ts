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
  leaveApi,
  enumerateDates,
  leaveDays,
  LEAVE_TYPE_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_STATUS_VARIANT,
  LEAVE_DURATION_LABEL,
  type CreateLeavePayload,
} from "@/lib/leave-api"

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

const payload: CreateLeavePayload = {
  leaveType: "VACATION",
  startDate: "2026-07-10",
  endDate: "2026-07-12",
  dayParts: { "2026-07-11": "HALF_AM" },
  reason: "Family trip",
  isDraft: false,
}

describe("leaveApi client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("createMine POSTs to /hr/leave-requests with the payload body", async () => {
    await leaveApi.createMine(payload)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests", payload)
  })

  it("update PUTs to /hr/leave-requests/{id} with the payload body", async () => {
    await leaveApi.update(42, payload)
    expect(mockApi.put).toHaveBeenCalledWith("/hr/leave-requests/42", payload)
  })

  it("submitDraft POSTs to /hr/leave-requests/{id}/submit", async () => {
    await leaveApi.submitDraft(3)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests/3/submit")
  })

  it("cancelMine POSTs to /hr/leave-requests/{id}/cancel", async () => {
    await leaveApi.cancelMine(5)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests/5/cancel")
  })

  it("deleteMine DELETEs /hr/leave-requests/{id}", async () => {
    await leaveApi.deleteMine(7)
    expect(mockApi.delete).toHaveBeenCalledWith("/hr/leave-requests/7")
  })

  it("listMine GETs /hr/leave-requests/me with default (page:0,size:50) + merged params", async () => {
    await leaveApi.listMine({
      status: "PENDING",
      from: "2026-01-01",
      to: "2026-12-31",
    })
    expect(mockApi.get).toHaveBeenCalledWith("/hr/leave-requests/me", {
      params: {
        page: 0,
        size: 50,
        status: "PENDING",
        from: "2026-01-01",
        to: "2026-12-31",
      },
    })
  })

  it("listMine defaults to just {page:0,size:50} when called with no params", async () => {
    await leaveApi.listMine()
    expect(mockApi.get).toHaveBeenCalledWith("/hr/leave-requests/me", {
      params: { page: 0, size: 50 },
    })
  })

  it("listAll GETs /hr/leave-requests with default (page:0,size:20) + merged params", async () => {
    await leaveApi.listAll({
      status: "APPROVED",
      from: "2026-01-01",
      to: "2026-06-30",
      page: 2,
      size: 50,
    })
    expect(mockApi.get).toHaveBeenCalledWith("/hr/leave-requests", {
      params: {
        page: 2,
        size: 50,
        status: "APPROVED",
        from: "2026-01-01",
        to: "2026-06-30",
      },
    })
  })

  it("listAll defaults to just {page:0,size:20} when called with no params", async () => {
    await leaveApi.listAll()
    expect(mockApi.get).toHaveBeenCalledWith("/hr/leave-requests", {
      params: { page: 0, size: 20 },
    })
  })

  it("approve POSTs to /hr/leave-requests/{id}/approve with reviewNote (null default)", async () => {
    await leaveApi.approve(9)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests/9/approve", {
      reviewNote: null,
    })

    mockApi.post.mockClear()
    await leaveApi.approve(9, "looks good")
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests/9/approve", {
      reviewNote: "looks good",
    })
  })

  it("reject POSTs to /hr/leave-requests/{id}/reject with reviewNote (null default)", async () => {
    await leaveApi.reject(11)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests/11/reject", {
      reviewNote: null,
    })

    mockApi.post.mockClear()
    await leaveApi.reject(11, "no")
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests/11/reject", {
      reviewNote: "no",
    })
  })

  it("returnForRevision POSTs to /hr/leave-requests/{id}/return with { reviewNote }", async () => {
    await leaveApi.returnForRevision(13, "please add dates")
    expect(mockApi.post).toHaveBeenCalledWith("/hr/leave-requests/13/return", {
      reviewNote: "please add dates",
    })
  })

  it("never sends a companyId on any call", async () => {
    await leaveApi.createMine(payload)
    await leaveApi.update(1, payload)
    await leaveApi.approve(1, "ok")
    await leaveApi.reject(1, "no")
    await leaveApi.returnForRevision(1, "revise")
    await leaveApi.listMine({ status: "PENDING" })
    await leaveApi.listAll({ status: "APPROVED" })

    const allArgs = [
      ...mockApi.post.mock.calls,
      ...mockApi.put.mock.calls,
      ...mockApi.get.mock.calls,
      ...mockApi.delete.mock.calls,
    ].flat()
    expect(allArgs.some(containsCompanyId)).toBe(false)
  })
})

describe("leave label maps", () => {
  it("exposes a label/variant for every leave type, status and duration", () => {
    expect(LEAVE_TYPE_LABEL.VACATION).toBe("Vacation")
    expect(LEAVE_TYPE_LABEL.PATERNITY).toBe("Paternity")
    expect(LEAVE_STATUS_LABEL.RETURNED).toBe("Needs revision")
    expect(LEAVE_STATUS_VARIANT.APPROVED).toBe("green")
    expect(LEAVE_STATUS_VARIANT.CANCELLED).toBe("gray")
    expect(LEAVE_DURATION_LABEL.HALF_PM).toBe("Half day (PM)")
  })
})

describe("enumerateDates", () => {
  it("returns [] when either bound is missing", () => {
    expect(enumerateDates("", "2026-07-10")).toEqual([])
    expect(enumerateDates("2026-07-10", "")).toEqual([])
  })

  it("returns [] when the end is before the start", () => {
    expect(enumerateDates("2026-07-10", "2026-07-09")).toEqual([])
  })

  it("returns the inclusive list of ISO dates from start..end", () => {
    expect(enumerateDates("2026-07-10", "2026-07-12")).toEqual([
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
    ])
  })

  it("returns a single date when start === end", () => {
    expect(enumerateDates("2026-07-10", "2026-07-10")).toEqual(["2026-07-10"])
  })
})

describe("leaveDays", () => {
  it("counts one day per date with no half-day overrides (default dayParts)", () => {
    expect(leaveDays("2026-07-10", "2026-07-12")).toBe(3)
  })

  it("subtracts 0.5 for each non-FULL half-day override and ignores FULL/absent", () => {
    expect(
      leaveDays("2026-07-10", "2026-07-12", {
        "2026-07-10": "HALF_AM", // 0.5
        "2026-07-11": "FULL", // full → 1
        // 2026-07-12 absent → 1
      })
    ).toBe(2.5)
  })

  it("returns 0 for an invalid range", () => {
    expect(leaveDays("2026-07-12", "2026-07-10")).toBe(0)
  })
})
