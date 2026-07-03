import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Mock the ob-api client so hooks never touch the network.
vi.mock("@/lib/ob-api", () => ({
  obApi: {
    createMine: vi.fn(() => Promise.resolve({ id: 1 })),
    approve: vi.fn(() => Promise.resolve({ id: 1 })),
  },
}))

import { obApi, type CreateObPayload } from "@/lib/ob-api"
import { useCreateObRequest, useApproveObRequest } from "@/hooks/use-ob"

const mockObApi = obApi as unknown as {
  createMine: ReturnType<typeof vi.fn>
  approve: ReturnType<typeof vi.fn>
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidateSpy }
}

const payload: CreateObPayload = {
  obDate: "2026-07-10",
  duration: "FULL_DAY",
  purpose: "Client meeting",
  location: "BGC",
  isDraft: false,
}

describe("use-ob hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("useCreateObRequest calls obApi.createMine with the payload and invalidates ['ob-requests']", async () => {
    const { wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(() => useCreateObRequest(), { wrapper })

    result.current.mutate(payload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockObApi.createMine).toHaveBeenCalledWith(payload)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ob-requests"] })
  })

  it("useApproveObRequest calls obApi.approve(id, reviewNote) and invalidates ['ob-requests']", async () => {
    const { wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(() => useApproveObRequest(), { wrapper })

    result.current.mutate({ id: 99, reviewNote: "approved" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockObApi.approve).toHaveBeenCalledWith(99, "approved")
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ob-requests"] })
  })
})
