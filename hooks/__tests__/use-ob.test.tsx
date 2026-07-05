import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Mock the whole ob API surface — each fn resolves so mutations settle and
// queries run their queryFn. The hooks are the unit under test; the client is not.
vi.mock("@/lib/ob-api", () => ({
  obApi: {
    listMine: vi.fn(() =>
      Promise.resolve({ content: [], totalElements: 0, totalPages: 0 })
    ),
    listAll: vi.fn(() =>
      Promise.resolve({ content: [], totalElements: 0, totalPages: 0 })
    ),
    createMine: vi.fn(() => Promise.resolve({ id: 1 })),
    updateMine: vi.fn(() => Promise.resolve({ id: 1 })),
    deleteMine: vi.fn(() => Promise.resolve(undefined)),
    submitDraft: vi.fn(() => Promise.resolve({ id: 1 })),
    cancelMine: vi.fn(() => Promise.resolve({ id: 1 })),
    approve: vi.fn(() => Promise.resolve({ id: 1 })),
    reject: vi.fn(() => Promise.resolve({ id: 1 })),
    returnForRevision: vi.fn(() => Promise.resolve({ id: 1 })),
  },
}))

import { obApi } from "@/lib/ob-api"
import {
  useMyObRequests,
  useAllObRequests,
  useCreateObRequest,
  useUpdateObRequest,
  useDeleteObRequest,
  useSubmitObDraft,
  useCancelObRequest,
  useApproveObRequest,
  useRejectObRequest,
  useReturnObRequest,
} from "@/hooks/use-ob"

const mockObApi = obApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const OB_KEY = { queryKey: ["ob-requests"] }

function setup() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries")
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, invalidateSpy, wrapper }
}

describe("use-ob query hooks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useMyObRequests forwards the params to obApi.listMine", async () => {
    const { wrapper } = setup()
    const params = {
      status: "PENDING" as const,
      from: "2026-01-01",
      to: "2026-12-31",
      page: 0,
      size: 20,
    }
    renderHook(() => useMyObRequests(params), { wrapper })
    await waitFor(() =>
      expect(mockObApi.listMine).toHaveBeenCalledWith(params)
    )
  })

  it("useMyObRequests defaults to empty params when called with none", async () => {
    const { wrapper } = setup()
    renderHook(() => useMyObRequests(), { wrapper })
    await waitFor(() => expect(mockObApi.listMine).toHaveBeenCalledWith({}))
  })

  it("useMyObRequests does not fetch when disabled", () => {
    const { wrapper } = setup()
    renderHook(() => useMyObRequests({ status: "APPROVED" }, false), { wrapper })
    expect(mockObApi.listMine).not.toHaveBeenCalled()
  })

  it("useAllObRequests forwards the params to obApi.listAll", async () => {
    const { wrapper } = setup()
    const params = {
      status: "APPROVED" as const,
      search: "jane",
      page: 1,
      size: 50,
    }
    renderHook(() => useAllObRequests(params), { wrapper })
    await waitFor(() => expect(mockObApi.listAll).toHaveBeenCalledWith(params))
  })

  it("useAllObRequests defaults to empty params when called with none", async () => {
    const { wrapper } = setup()
    renderHook(() => useAllObRequests(), { wrapper })
    await waitFor(() => expect(mockObApi.listAll).toHaveBeenCalledWith({}))
  })
})

describe("use-ob mutation hooks (call + invalidate)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useCreateObRequest posts the body and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCreateObRequest(), { wrapper })
    const body = {
      obDate: "2026-07-10",
      duration: "FULL_DAY" as const,
      purpose: "Client meeting",
      location: "BGC",
      isDraft: false,
    }
    await result.current.mutateAsync(body)
    expect(mockObApi.createMine).toHaveBeenCalledWith(body)
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })

  it("useUpdateObRequest puts (id, body) and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useUpdateObRequest(), { wrapper })
    const body = {
      obDate: "2026-07-10",
      duration: "HALF_DAY_AM" as const,
      purpose: "Training",
      location: "Makati",
    }
    await result.current.mutateAsync({ id: 5, body })
    expect(mockObApi.updateMine).toHaveBeenCalledWith(5, body)
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })

  it("useDeleteObRequest deletes by id and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useDeleteObRequest(), { wrapper })
    await result.current.mutateAsync(7)
    expect(mockObApi.deleteMine).toHaveBeenCalledWith(7)
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })

  it("useSubmitObDraft submits by id and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useSubmitObDraft(), { wrapper })
    await result.current.mutateAsync(3)
    expect(mockObApi.submitDraft).toHaveBeenCalledWith(3)
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })

  it("useCancelObRequest cancels by id and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCancelObRequest(), { wrapper })
    await result.current.mutateAsync(9)
    expect(mockObApi.cancelMine).toHaveBeenCalledWith(9)
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })

  it("useApproveObRequest approves (id, reviewNote) and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useApproveObRequest(), { wrapper })
    await result.current.mutateAsync({ id: 1, reviewNote: "looks good" })
    expect(mockObApi.approve).toHaveBeenCalledWith(1, "looks good")
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })

  it("useRejectObRequest rejects (id, reviewNote) and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useRejectObRequest(), { wrapper })
    await result.current.mutateAsync({ id: 2, reviewNote: null })
    expect(mockObApi.reject).toHaveBeenCalledWith(2, null)
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })

  it("useReturnObRequest returns (id, reviewNote) and invalidates ob-requests", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useReturnObRequest(), { wrapper })
    await result.current.mutateAsync({ id: 3, reviewNote: "please revise" })
    expect(mockObApi.returnForRevision).toHaveBeenCalledWith(3, "please revise")
    expect(invalidateSpy).toHaveBeenCalledWith(OB_KEY)
  })
})
