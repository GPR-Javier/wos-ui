import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Mock the whole overtime API surface — each fn resolves so mutations settle and
// queries run their queryFn. The hooks are the unit under test; the client is not.
vi.mock("@/lib/overtime-api", () => ({
  overtimeApi: {
    listMine: vi.fn(() =>
      Promise.resolve({ content: [], totalElements: 0, totalPages: 0 })
    ),
    listAll: vi.fn(() =>
      Promise.resolve({ content: [], totalElements: 0, totalPages: 0 })
    ),
    createMine: vi.fn(() => Promise.resolve({ id: 1 })),
    submitDraft: vi.fn(() => Promise.resolve({ id: 1 })),
    cancelMine: vi.fn(() => Promise.resolve({ id: 1 })),
    approve: vi.fn(() => Promise.resolve({ id: 1 })),
    reject: vi.fn(() => Promise.resolve({ id: 1 })),
    createAuthorization: vi.fn(() => Promise.resolve({ id: 1 })),
    decline: vi.fn(() => Promise.resolve({ id: 1 })),
    resubmit: vi.fn(() => Promise.resolve({ id: 1 })),
    submitClaim: vi.fn(() => Promise.resolve({ id: 1 })),
    createEmergency: vi.fn(() => Promise.resolve({ id: 1 })),
    bulkAuthorize: vi.fn(() => Promise.resolve([{ id: 1 }])),
    authorize: vi.fn(() => Promise.resolve({ id: 1 })),
    rejectAuthorization: vi.fn(() => Promise.resolve({ id: 1 })),
    returnAuthorization: vi.fn(() => Promise.resolve({ id: 1 })),
    approveClaim: vi.fn(() => Promise.resolve({ id: 1 })),
    rejectClaim: vi.fn(() => Promise.resolve({ id: 1 })),
    returnClaim: vi.fn(() => Promise.resolve({ id: 1 })),
  },
}))

import { overtimeApi } from "@/lib/overtime-api"
import {
  useMyOvertimeRequests,
  useAllOvertimeRequests,
  useCreateOvertimeRequest,
  useSubmitOvertimeDraft,
  useCancelOvertimeRequest,
  useApproveOvertimeRequest,
  useRejectOvertimeRequest,
  useCreateOvertimeAuthorization,
  useDeclineOvertimeRequest,
  useResubmitOvertimeRequest,
  useSubmitOvertimeClaim,
  useCreateEmergencyOvertime,
  useBulkAuthorizeOvertime,
  useAuthorizeOvertime,
  useRejectOvertimeAuthorization,
  useReturnOvertimeAuthorization,
  useApproveOvertimeClaim,
  useRejectOvertimeClaim,
  useReturnOvertimeClaim,
} from "@/hooks/use-overtime"

const mock = overtimeApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const OT_KEY = { queryKey: ["overtime-requests"] }

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

describe("use-overtime query hooks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useMyOvertimeRequests forwards the params to overtimeApi.listMine", async () => {
    const { wrapper } = setup()
    const params = {
      status: "PENDING_AUTH" as const,
      from: "2026-01-01",
      to: "2026-12-31",
      page: 0,
      size: 20,
    }
    renderHook(() => useMyOvertimeRequests(params), { wrapper })
    await waitFor(() => expect(mock.listMine).toHaveBeenCalledWith(params))
  })

  it("useMyOvertimeRequests defaults to empty params when called with none", async () => {
    const { wrapper } = setup()
    renderHook(() => useMyOvertimeRequests(), { wrapper })
    await waitFor(() => expect(mock.listMine).toHaveBeenCalledWith({}))
  })

  it("useAllOvertimeRequests forwards the params to overtimeApi.listAll", async () => {
    const { wrapper } = setup()
    const params = {
      status: "APPROVED" as const,
      search: "jane",
      page: 1,
      size: 50,
    }
    renderHook(() => useAllOvertimeRequests(params), { wrapper })
    await waitFor(() => expect(mock.listAll).toHaveBeenCalledWith(params))
  })

  it("useAllOvertimeRequests defaults to empty params when called with none", async () => {
    const { wrapper } = setup()
    renderHook(() => useAllOvertimeRequests(), { wrapper })
    await waitFor(() => expect(mock.listAll).toHaveBeenCalledWith({}))
  })
})

describe("use-overtime mutation hooks (call + invalidate)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useCreateOvertimeRequest posts the body and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCreateOvertimeRequest(), { wrapper })
    const body = {
      overtimeDate: "2026-07-10",
      startTime: "18:00",
      endTime: "20:00",
      overtimeType: "REGULAR" as const,
      reason: "crunch",
      isDraft: false,
    }
    await result.current.mutateAsync(body)
    expect(mock.createMine).toHaveBeenCalledWith(body)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useSubmitOvertimeDraft submits by id and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useSubmitOvertimeDraft(), { wrapper })
    await result.current.mutateAsync(3)
    expect(mock.submitDraft).toHaveBeenCalledWith(3)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useCancelOvertimeRequest cancels by id and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCancelOvertimeRequest(), { wrapper })
    await result.current.mutateAsync(9)
    expect(mock.cancelMine).toHaveBeenCalledWith(9)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useApproveOvertimeRequest approves (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useApproveOvertimeRequest(), {
      wrapper,
    })
    await result.current.mutateAsync({ id: 1, reviewNote: "ok" })
    expect(mock.approve).toHaveBeenCalledWith(1, "ok")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useRejectOvertimeRequest rejects (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useRejectOvertimeRequest(), { wrapper })
    await result.current.mutateAsync({ id: 2, reviewNote: null })
    expect(mock.reject).toHaveBeenCalledWith(2, null)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useCreateOvertimeAuthorization posts the body and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCreateOvertimeAuthorization(), {
      wrapper,
    })
    const body = {
      overtimeDate: "2026-07-10",
      plannedStartTime: "18:00",
      plannedEndTime: "20:00",
      reason: "planned",
      isDraft: false,
    }
    await result.current.mutateAsync(body)
    expect(mock.createAuthorization).toHaveBeenCalledWith(body)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useDeclineOvertimeRequest declines (id, reason) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useDeclineOvertimeRequest(), {
      wrapper,
    })
    await result.current.mutateAsync({ id: 4, reason: "busy" })
    expect(mock.decline).toHaveBeenCalledWith(4, "busy")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useResubmitOvertimeRequest resubmits by id and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useResubmitOvertimeRequest(), {
      wrapper,
    })
    await result.current.mutateAsync(5)
    expect(mock.resubmit).toHaveBeenCalledWith(5)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useSubmitOvertimeClaim submits (id, body) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useSubmitOvertimeClaim(), { wrapper })
    const body = { startTime: "18:00", endTime: "20:30", reason: "over" }
    await result.current.mutateAsync({ id: 6, body })
    expect(mock.submitClaim).toHaveBeenCalledWith(6, body)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useCreateEmergencyOvertime posts the body and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCreateEmergencyOvertime(), {
      wrapper,
    })
    const body = {
      overtimeDate: "2026-07-10",
      startTime: "18:00",
      endTime: "20:00",
      overtimeType: "EMERGENCY" as const,
      reason: "system down",
      isDraft: false,
    }
    await result.current.mutateAsync(body)
    expect(mock.createEmergency).toHaveBeenCalledWith(body)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useBulkAuthorizeOvertime posts the body and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useBulkAuthorizeOvertime(), { wrapper })
    const body = {
      overtimeDate: "2026-07-10",
      plannedStartTime: "18:00",
      plannedEndTime: "20:00",
      reason: "team",
      userIds: [1, 2],
    }
    await result.current.mutateAsync(body)
    expect(mock.bulkAuthorize).toHaveBeenCalledWith(body)
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useAuthorizeOvertime authorizes (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useAuthorizeOvertime(), { wrapper })
    await result.current.mutateAsync({ id: 1, reviewNote: "go" })
    expect(mock.authorize).toHaveBeenCalledWith(1, "go")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useRejectOvertimeAuthorization rejects (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useRejectOvertimeAuthorization(), {
      wrapper,
    })
    await result.current.mutateAsync({ id: 2, reviewNote: "no" })
    expect(mock.rejectAuthorization).toHaveBeenCalledWith(2, "no")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useReturnOvertimeAuthorization returns (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useReturnOvertimeAuthorization(), {
      wrapper,
    })
    await result.current.mutateAsync({ id: 3, reviewNote: "revise" })
    expect(mock.returnAuthorization).toHaveBeenCalledWith(3, "revise")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useApproveOvertimeClaim approves (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useApproveOvertimeClaim(), { wrapper })
    await result.current.mutateAsync({ id: 4, reviewNote: "great" })
    expect(mock.approveClaim).toHaveBeenCalledWith(4, "great")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useRejectOvertimeClaim rejects (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useRejectOvertimeClaim(), { wrapper })
    await result.current.mutateAsync({ id: 5, reviewNote: "wrong" })
    expect(mock.rejectClaim).toHaveBeenCalledWith(5, "wrong")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })

  it("useReturnOvertimeClaim returns (id, reviewNote) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useReturnOvertimeClaim(), { wrapper })
    await result.current.mutateAsync({ id: 6, reviewNote: "recheck" })
    expect(mock.returnClaim).toHaveBeenCalledWith(6, "recheck")
    expect(invalidateSpy).toHaveBeenCalledWith(OT_KEY)
  })
})
