import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Mock the whole leave API surface — each fn resolves so mutations settle and
// queries run their queryFn. The hooks are the unit under test; the client is not.
vi.mock("@/lib/leave-api", () => ({
  leaveApi: {
    listMine: vi.fn(() =>
      Promise.resolve({ content: [], totalElements: 0, totalPages: 0 })
    ),
    listAll: vi.fn(() =>
      Promise.resolve({ content: [], totalElements: 0, totalPages: 0 })
    ),
    createMine: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve({ id: 1 })),
    deleteMine: vi.fn(() => Promise.resolve(undefined)),
    submitDraft: vi.fn(() => Promise.resolve({ id: 1 })),
    cancelMine: vi.fn(() => Promise.resolve({ id: 1 })),
    approve: vi.fn(() => Promise.resolve({ id: 1 })),
    reject: vi.fn(() => Promise.resolve({ id: 1 })),
    returnForRevision: vi.fn(() => Promise.resolve({ id: 1 })),
  },
}))

import { leaveApi } from "@/lib/leave-api"
import {
  useMyLeaveRequests,
  useAllLeaveRequests,
  useCreateLeaveRequest,
  useUpdateLeaveRequest,
  useSubmitLeaveDraft,
  useCancelLeaveRequest,
  useDeleteLeaveRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useReturnLeaveRequest,
} from "@/hooks/use-leave"

const mockLeaveApi = leaveApi as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>
const LEAVE_KEY = { queryKey: ["leave-requests"] }
const BALANCES_KEY = { queryKey: ["employee", "leave-balances"] }
const HR_KEY = { queryKey: ["hr", "leave-requests"] }

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

/** Every leave mutation fans out the same 3 invalidations. */
function expectFullInvalidation(invalidateSpy: ReturnType<typeof vi.spyOn>) {
  expect(invalidateSpy).toHaveBeenCalledWith(LEAVE_KEY)
  expect(invalidateSpy).toHaveBeenCalledWith(BALANCES_KEY)
  expect(invalidateSpy).toHaveBeenCalledWith(HR_KEY)
}

describe("use-leave query hooks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useMyLeaveRequests forwards the params to leaveApi.listMine", async () => {
    const { wrapper } = setup()
    const params = {
      status: "PENDING" as const,
      from: "2026-01-01",
      to: "2026-12-31",
      page: 0,
      size: 50,
    }
    renderHook(() => useMyLeaveRequests(params), { wrapper })
    await waitFor(() =>
      expect(mockLeaveApi.listMine).toHaveBeenCalledWith(params)
    )
  })

  it("useMyLeaveRequests defaults to empty params when called with none", async () => {
    const { wrapper } = setup()
    renderHook(() => useMyLeaveRequests(), { wrapper })
    await waitFor(() => expect(mockLeaveApi.listMine).toHaveBeenCalledWith({}))
  })

  it("useMyLeaveRequests does not fetch when disabled", () => {
    const { wrapper } = setup()
    renderHook(() => useMyLeaveRequests({ status: "APPROVED" }, false), {
      wrapper,
    })
    expect(mockLeaveApi.listMine).not.toHaveBeenCalled()
  })

  it("useAllLeaveRequests forwards the params to leaveApi.listAll", async () => {
    const { wrapper } = setup()
    const params = {
      status: "APPROVED",
      from: "2026-01-01",
      to: "2026-06-30",
      page: 1,
      size: 20,
    }
    renderHook(() => useAllLeaveRequests(params), { wrapper })
    await waitFor(() =>
      expect(mockLeaveApi.listAll).toHaveBeenCalledWith(params)
    )
  })

  it("useAllLeaveRequests defaults to empty params when called with none", async () => {
    const { wrapper } = setup()
    renderHook(() => useAllLeaveRequests(), { wrapper })
    await waitFor(() => expect(mockLeaveApi.listAll).toHaveBeenCalledWith({}))
  })
})

describe("use-leave mutation hooks (call + full invalidation)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useCreateLeaveRequest posts the body and invalidates the 3 keys", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCreateLeaveRequest(), { wrapper })
    const body = {
      leaveType: "VACATION" as const,
      startDate: "2026-07-10",
      endDate: "2026-07-12",
      isDraft: false,
    }
    await result.current.mutateAsync(body)
    expect(mockLeaveApi.createMine).toHaveBeenCalledWith(body)
    expectFullInvalidation(invalidateSpy)
  })

  it("useUpdateLeaveRequest puts (id, body) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useUpdateLeaveRequest(), { wrapper })
    const body = {
      leaveType: "SICK" as const,
      startDate: "2026-07-10",
      endDate: "2026-07-10",
    }
    await result.current.mutateAsync({ id: 5, body })
    expect(mockLeaveApi.update).toHaveBeenCalledWith(5, body)
    expectFullInvalidation(invalidateSpy)
  })

  it("useSubmitLeaveDraft submits by id and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useSubmitLeaveDraft(), { wrapper })
    await result.current.mutateAsync(3)
    expect(mockLeaveApi.submitDraft).toHaveBeenCalledWith(3)
    expectFullInvalidation(invalidateSpy)
  })

  it("useCancelLeaveRequest cancels by id and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCancelLeaveRequest(), { wrapper })
    await result.current.mutateAsync(9)
    expect(mockLeaveApi.cancelMine).toHaveBeenCalledWith(9)
    expectFullInvalidation(invalidateSpy)
  })

  it("useDeleteLeaveRequest deletes by id and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useDeleteLeaveRequest(), { wrapper })
    await result.current.mutateAsync(7)
    expect(mockLeaveApi.deleteMine).toHaveBeenCalledWith(7)
    expectFullInvalidation(invalidateSpy)
  })

  it("useApproveLeaveRequest approves (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useApproveLeaveRequest(), { wrapper })
    await result.current.mutateAsync({ id: 1, reviewNote: "ok" })
    expect(mockLeaveApi.approve).toHaveBeenCalledWith(1, "ok")
    expectFullInvalidation(invalidateSpy)
  })

  it("useRejectLeaveRequest rejects (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useRejectLeaveRequest(), { wrapper })
    await result.current.mutateAsync({ id: 2, reviewNote: null })
    expect(mockLeaveApi.reject).toHaveBeenCalledWith(2, null)
    expectFullInvalidation(invalidateSpy)
  })

  it("useReturnLeaveRequest returns (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useReturnLeaveRequest(), { wrapper })
    await result.current.mutateAsync({ id: 3, reviewNote: "please revise" })
    expect(mockLeaveApi.returnForRevision).toHaveBeenCalledWith(
      3,
      "please revise"
    )
    expectFullInvalidation(invalidateSpy)
  })
})
