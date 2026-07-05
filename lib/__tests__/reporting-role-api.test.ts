import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the axios `api` instance — every method resolves with a canned axios-like response.
vi.mock("@/lib/api", () => {
  const api = {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: undefined })),
  }
  return { api }
})

import { api } from "@/lib/api"
import { reportingRoleApi } from "@/lib/reporting-role-api"

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

describe("reportingRoleApi client", () => {
  beforeEach(() => vi.clearAllMocks())

  it("list GETs /hr/reporting-roles with empty params by default", async () => {
    await reportingRoleApi.list()
    expect(mockApi.get).toHaveBeenCalledWith("/hr/reporting-roles", {
      params: {},
    })
  })

  it("list forwards includeInactive as a query param", async () => {
    await reportingRoleApi.list({ includeInactive: true })
    expect(mockApi.get).toHaveBeenCalledWith("/hr/reporting-roles", {
      params: { includeInactive: true },
    })
  })

  it("create POSTs to /hr/reporting-roles with the label body", async () => {
    await reportingRoleApi.create({ label: "Dotted-line" })
    expect(mockApi.post).toHaveBeenCalledWith("/hr/reporting-roles", {
      label: "Dotted-line",
    })
  })

  it("update PUTs to /hr/reporting-roles/{id} with the patch body", async () => {
    await reportingRoleApi.update(7, { label: "Renamed", active: false })
    expect(mockApi.put).toHaveBeenCalledWith("/hr/reporting-roles/7", {
      label: "Renamed",
      active: false,
    })
  })

  it("remove DELETEs /hr/reporting-roles/{id}", async () => {
    await reportingRoleApi.remove(42)
    expect(mockApi.delete).toHaveBeenCalledWith("/hr/reporting-roles/42")
  })
})
