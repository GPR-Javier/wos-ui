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
import { obApi, type CreateObPayload } from "@/lib/ob-api"

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

const payload: CreateObPayload = {
  obDate: "2026-07-10",
  duration: "FULL_DAY",
  purpose: "Client meeting",
  location: "BGC",
  isDraft: false,
}

describe("obApi client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("createMine POSTs to /hr/ob-requests with the payload body", async () => {
    await obApi.createMine(payload)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/ob-requests", payload)
  })

  it("updateMine PUTs to /hr/ob-requests/{id} with the payload body", async () => {
    await obApi.updateMine(42, payload)
    expect(mockApi.put).toHaveBeenCalledWith("/hr/ob-requests/42", payload)
  })

  it("deleteMine DELETEs /hr/ob-requests/{id}", async () => {
    await obApi.deleteMine(7)
    expect(mockApi.delete).toHaveBeenCalledWith("/hr/ob-requests/7")
  })

  it("submitDraft POSTs to /hr/ob-requests/{id}/submit", async () => {
    await obApi.submitDraft(3)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/ob-requests/3/submit")
  })

  it("cancelMine POSTs to /hr/ob-requests/{id}/cancel", async () => {
    await obApi.cancelMine(5)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/ob-requests/5/cancel")
  })

  it("approve POSTs to /hr/ob-requests/{id}/approve with reviewNote (null default)", async () => {
    await obApi.approve(9)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/ob-requests/9/approve", {
      reviewNote: null,
    })

    mockApi.post.mockClear()
    await obApi.approve(9, "looks good")
    expect(mockApi.post).toHaveBeenCalledWith("/hr/ob-requests/9/approve", {
      reviewNote: "looks good",
    })
  })

  it("reject POSTs to /hr/ob-requests/{id}/reject with reviewNote (null default)", async () => {
    await obApi.reject(11)
    expect(mockApi.post).toHaveBeenCalledWith("/hr/ob-requests/11/reject", {
      reviewNote: null,
    })
  })

  it("returnForRevision POSTs to /hr/ob-requests/{id}/return with { reviewNote }", async () => {
    await obApi.returnForRevision(13, "please add venue")
    expect(mockApi.post).toHaveBeenCalledWith("/hr/ob-requests/13/return", {
      reviewNote: "please add venue",
    })
  })

  it("listMine GETs /hr/ob-requests/me with default + merged query params", async () => {
    await obApi.listMine({
      status: "PENDING",
      from: "2026-01-01",
      to: "2026-12-31",
    })
    expect(mockApi.get).toHaveBeenCalledWith("/hr/ob-requests/me", {
      params: {
        page: 0,
        size: 20,
        status: "PENDING",
        from: "2026-01-01",
        to: "2026-12-31",
      },
    })
  })

  it("listAll GETs /hr/ob-requests with {status,search,from,to,page,size}", async () => {
    await obApi.listAll({
      status: "APPROVED",
      search: "jane",
      from: "2026-01-01",
      to: "2026-06-30",
      page: 2,
      size: 50,
    })
    expect(mockApi.get).toHaveBeenCalledWith("/hr/ob-requests", {
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

  it("never sends a companyId on any call", async () => {
    await obApi.createMine(payload)
    await obApi.updateMine(1, payload)
    await obApi.approve(1, "ok")
    await obApi.reject(1, "no")
    await obApi.returnForRevision(1, "revise")
    await obApi.listMine({ status: "PENDING" })
    await obApi.listAll({ search: "x" })

    const allArgs = [
      ...mockApi.post.mock.calls,
      ...mockApi.put.mock.calls,
      ...mockApi.get.mock.calls,
      ...mockApi.delete.mock.calls,
    ].flat()
    expect(allArgs.some(containsCompanyId)).toBe(false)
  })
})
